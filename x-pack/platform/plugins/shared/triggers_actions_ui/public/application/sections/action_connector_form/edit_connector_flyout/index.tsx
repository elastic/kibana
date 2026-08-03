/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo, useCallback, useEffect, useRef, useMemo, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import type { IconType } from '@elastic/eui';
import {
  EuiButton,
  EuiFlyout,
  EuiFlyoutBody,
  EuiConfirmModal,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { isActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { Option } from 'fp-ts/Option';
import { none, some } from 'fp-ts/Option';
import type { ConnectorFormSchema } from '@kbn/alerts-ui-shared';
import { useActionTypeModel } from '@kbn/alerts-ui-shared/src/common/hooks/use_action_type_model';
import { ReadOnlyConnectorMessage } from './read_only';
import type {
  ActionConnector,
  ActionTypeRegistryContract,
  UserConfiguredActionConnector,
} from '../../../../types';
import { EditConnectorTabs } from '../../../../types';
import type { ConnectorFormState } from '../connector_form';
import { ConnectorForm } from '../connector_form';
import { useUpdateConnector } from '../../../hooks/use_edit_connector';
import { useKibana } from '../../../../common/lib/kibana';
import { hasSaveActionsCapability } from '../../../lib/capabilities';
import { getSpecConnectorTestExecutionParams } from '../../../lib/get_spec_connector_test_execution_params';
import { TestConnectorForm } from '../test_connector_form';
import { ConnectorRulesList } from '../connector_rules_list';
import { useExecuteConnector } from '../../../hooks/use_execute_connector';
import { FlyoutHeader } from './header';
import { FlyoutFooter } from './footer';

export interface EditConnectorFlyoutProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  connector: ActionConnector;
  onClose: () => void;
  tab?: EditConnectorTabs;
  onConnectorUpdated?: (connector: ActionConnector) => void;
  isServerless?: boolean;
  icon?: IconType;
  hideRulesTab?: boolean;
}

interface EditConnectorFlyoutContentProps extends EditConnectorFlyoutProps {
  isFormModified: boolean;
  onFormModifiedChange: (isModified: boolean) => void;
  onCloseAttempt: () => void;
  showConfirmModal: boolean;
  onConfirmModalCancel: () => void;
}

const getConnectorWithoutSecrets = (
  connector: UserConfiguredActionConnector<Record<string, unknown>, Record<string, unknown>>
) => ({
  ...connector,
  isMissingSecrets: connector.isMissingSecrets ?? false,
  secrets: {},
  authMode: connector.authMode ?? 'shared',
});

interface ConnectorSpecLoadStateProps {
  showLoadingSpinner: boolean;
  actionTypeModelError: Error | null;
  onRetry: () => void;
}

/**
 * Loading spinner and load-error callout shared by the configuration and
 * test tabs while the connector spec is being fetched.
 */
const ConnectorSpecLoadState: React.FC<ConnectorSpecLoadStateProps> = ({
  showLoadingSpinner,
  actionTypeModelError,
  onRetry,
}) => (
  <>
    {showLoadingSpinner && (
      <EuiFlexGroup
        direction="column"
        justifyContent="center"
        alignItems="center"
        style={{ minHeight: 200 }}
        aria-live="polite"
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {i18n.translate(
            'xpack.triggersActionsUI.sections.editConnectorForm.loadingConnectorConfiguration',
            {
              defaultMessage: 'Loading connector configuration...',
            }
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    )}

    {actionTypeModelError && (
      <>
        <EuiCallOut
          announceOnMount
          size="s"
          color="danger"
          iconType="error"
          data-test-subj="connector-spec-load-error"
          title={i18n.translate(
            'xpack.triggersActionsUI.sections.actionConnectorAdd.specLoadError',
            {
              defaultMessage: 'Failed to load connector configuration',
            }
          )}
        >
          <p>
            {i18n.translate(
              'xpack.triggersActionsUI.sections.editConnectorForm.specLoadErrorDescription',
              {
                defaultMessage:
                  'The connector form could not be loaded. Try again, or contact your administrator if the problem persists.',
              }
            )}
          </p>
          <EuiSpacer size="s" />
          <EuiButton color="danger" data-test-subj="connector-spec-load-retry" onClick={onRetry}>
            {i18n.translate(
              'xpack.triggersActionsUI.sections.editConnectorForm.specLoadErrorRetry',
              {
                defaultMessage: 'Retry',
              }
            )}
          </EuiButton>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    )}
  </>
);

export const EditConnectorFlyoutContent: React.FC<EditConnectorFlyoutContentProps> = ({
  actionTypeRegistry,
  connector,
  onClose,
  tab = EditConnectorTabs.Configuration,
  onConnectorUpdated,
  icon,
  hideRulesTab = false,
  isFormModified,
  onFormModifiedChange: onFormModifiedChangeProp,
  onCloseAttempt,
  showConfirmModal,
  onConfirmModalCancel,
}) => {
  const confirmModalTitleId = useGeneratedHtmlId();

  const {
    docLinks,
    http,
    uiSettings,
    application: { capabilities },
  } = useKibana().services;

  const isMounted = useRef(false);
  const canSave = hasSaveActionsCapability(capabilities);
  const { isLoading: isUpdatingConnector, updateConnector } = useUpdateConnector();
  const { isLoading: isExecutingConnector, executeConnector } = useExecuteConnector();
  const [showFormErrors, setShowFormErrors] = useState<boolean>(false);

  const [preSubmitValidationErrorMessage, setPreSubmitValidationErrorMessage] =
    useState<ReactNode>(null);

  const [formState, setFormState] = useState<ConnectorFormState>({
    isSubmitted: false,
    isSubmitting: false,
    isValid: undefined,
    submit: async () => ({ isValid: false, data: {} as ConnectorFormSchema }),
    preSubmitValidator: null,
  });

  const [selectedTab, setTab] = useState<EditConnectorTabs>(tab);
  /**
   * Test connector
   */

  const [testExecutionActionParams, setTestExecutionActionParams] = useState<
    Record<string, unknown>
  >({});

  const onEditAction = useCallback(
    (field: string, value: unknown) =>
      setTestExecutionActionParams((oldParams) => ({ ...oldParams, [field]: value })),
    []
  );

  const [testExecutionResult, setTestExecutionResult] =
    useState<Option<ActionTypeExecutorResult<unknown> | undefined>>(none);

  const handleSetTab = useCallback(
    (nextPage: EditConnectorTabs) => {
      if (nextPage === EditConnectorTabs.Configuration && testExecutionResult !== none) {
        setTestExecutionResult(none);
      }
      setShowFormErrors(false);
      setTab(nextPage);
    },
    [testExecutionResult, setTestExecutionResult]
  );

  const [isEdit, setIsEdit] = useState<boolean>(true);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const { preSubmitValidator, submit, isValid: isFormValid, isSubmitting } = formState;
  const hasErrors = isFormValid === false;
  const isSaving = isUpdatingConnector || isSubmitting || isExecutingConnector;

  const {
    actionTypeModel,
    isLoading: isLoadingActionTypeModel,
    error: actionTypeModelError,
    refetch: refetchConnectorSpec,
  } = useActionTypeModel({
    actionTypeRegistry,
    actionTypeId: connector.actionTypeId,
    http,
    docLinks,
    uiSettings,
  });

  const isSpecConnector = !actionTypeRegistry.has(connector.actionTypeId);
  const isTestable = actionTypeModel?.isTestable ?? actionTypeRegistry.has(connector.actionTypeId);

  // Delay the spinner so quick spec loads don't flash a loading state.
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(false);
  useDebounce(() => setShowLoadingSpinner(isLoadingActionTypeModel), 300, [
    isLoadingActionTypeModel,
  ]);

  const showButtons =
    canSave &&
    actionTypeModel &&
    !connector.isPreconfigured &&
    !isLoadingActionTypeModel &&
    !actionTypeModelError;
  const disabled =
    !isFormModified ||
    hasErrors ||
    isSaving ||
    isLoadingActionTypeModel ||
    !!actionTypeModelError ||
    !actionTypeModel;

  const connectorWithoutSecrets = useMemo(
    () =>
      getConnectorWithoutSecrets(
        connector as UserConfiguredActionConnector<Record<string, unknown>, Record<string, unknown>>
      ),
    [connector]
  );

  const resolvedTestExecutionActionParams = useMemo(
    () =>
      getSpecConnectorTestExecutionParams(testExecutionActionParams, {
        isSpec: isSpecConnector,
        isTestable,
      }),
    [isSpecConnector, isTestable, testExecutionActionParams]
  );

  const onExecutionAction = useCallback(async () => {
    try {
      const res = await executeConnector({
        connectorId: connector.id,
        params: resolvedTestExecutionActionParams,
      });

      setTestExecutionResult(some(res));
    } catch (error) {
      const result: ActionTypeExecutorResult<unknown> = isActionTypeExecutorResult(error)
        ? error
        : {
            actionId: connector.id,
            status: 'error',
            message: error.message,
          };
      setTestExecutionResult(some(result));
    }
  }, [connector.id, executeConnector, resolvedTestExecutionActionParams]);

  const onFormModifiedChange = useCallback(
    (formModified: boolean) => {
      if (formModified) {
        setIsSaved(false);
      }
      onFormModifiedChangeProp(formModified);
      setTestExecutionResult(none);
    },
    [onFormModifiedChangeProp]
  );

  const onClickSave = useCallback(async () => {
    setPreSubmitValidationErrorMessage(null);
    setShowFormErrors(false);

    const { isValid, data } = await submit();
    if (!isMounted.current) {
      // User has closed the flyout meanwhile submitting the form
      return;
    }

    if (isValid) {
      if (preSubmitValidator) {
        const validatorRes = await preSubmitValidator();

        if (validatorRes) {
          setPreSubmitValidationErrorMessage(validatorRes.message);
          return;
        }
      }

      /**
       * At this point the form is valid
       * and there are no pre submit error messages.
       */
      const { name, config, secrets } = data;
      const validConnector = {
        id: connector.id,
        name: name ?? '',
        config: config ?? {},
        secrets: secrets ?? {},
      };

      const updatedConnector = await updateConnector(validConnector);

      if (updatedConnector) {
        /**
         * ConnectorFormSchema has been saved.
         * Set the from to clean state.
         */
        onFormModifiedChange(false);

        if (onConnectorUpdated) {
          onConnectorUpdated(updatedConnector);
        }
        setIsSaved(true);
        setIsEdit(false);
        setIsEdit(true);
      }

      return updatedConnector;
    } else {
      setShowFormErrors(true);
    }
  }, [
    onConnectorUpdated,
    submit,
    preSubmitValidator,
    connector.id,
    updateConnector,
    onFormModifiedChange,
  ]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  const renderConfigurationTab = useCallback(() => {
    if (!connector.isPreconfigured && !connector.isSystemAction) {
      return (
        <>
          {isEdit && (
            <>
              {showFormErrors && (
                <>
                  <EuiCallOut
                    announceOnMount
                    size="s"
                    color="danger"
                    iconType="warning"
                    data-test-subj="connector-form-header-error-label"
                    title={i18n.translate(
                      'xpack.triggersActionsUI.sections.editConnectorForm.headerFormLabel',
                      {
                        defaultMessage: 'There are errors in the form',
                      }
                    )}
                  />
                  <EuiSpacer size="m" />
                </>
              )}
              <ConnectorSpecLoadState
                showLoadingSpinner={showLoadingSpinner}
                actionTypeModelError={actionTypeModelError}
                onRetry={refetchConnectorSpec}
              />

              {actionTypeModel && !isLoadingActionTypeModel && !actionTypeModelError && (
                <>
                  <ConnectorForm
                    actionTypeModel={actionTypeModel}
                    connector={connectorWithoutSecrets}
                    isEdit={isEdit}
                    onChange={setFormState}
                    onFormModifiedChange={onFormModifiedChange}
                  />
                  {!!preSubmitValidationErrorMessage && <p>{preSubmitValidationErrorMessage}</p>}
                </>
              )}
            </>
          )}
        </>
      );
    }

    return (
      <ReadOnlyConnectorMessage
        href={docLinks.links.alerting.preconfiguredConnectors}
        extraComponent={actionTypeModel?.actionReadOnlyExtraComponent}
        connectorId={connector.id}
        connectorName={connector.name}
      />
    );
  }, [
    connector,
    connectorWithoutSecrets,
    docLinks.links.alerting.preconfiguredConnectors,
    actionTypeModel,
    actionTypeModelError,
    isEdit,
    isLoadingActionTypeModel,
    showLoadingSpinner,
    showFormErrors,
    onFormModifiedChange,
    preSubmitValidationErrorMessage,
    refetchConnectorSpec,
  ]);

  const renderTestTab = useCallback(() => {
    return (
      <>
        <ConnectorSpecLoadState
          showLoadingSpinner={showLoadingSpinner}
          actionTypeModelError={actionTypeModelError}
          onRetry={refetchConnectorSpec}
        />

        {actionTypeModel && !isLoadingActionTypeModel && !actionTypeModelError && (
          <TestConnectorForm
            connector={connector}
            executeEnabled={!isFormModified}
            actionParams={resolvedTestExecutionActionParams}
            onEditAction={onEditAction}
            onExecutionAction={onExecutionAction}
            isExecutingAction={isExecutingConnector}
            executionResult={testExecutionResult}
            actionTypeModel={actionTypeModel}
            hideActionParamsStep={isSpecConnector}
          />
        )}
      </>
    );
  }, [
    connector,
    isFormModified,
    resolvedTestExecutionActionParams,
    onEditAction,
    onExecutionAction,
    isExecutingConnector,
    testExecutionResult,
    actionTypeModel,
    isLoadingActionTypeModel,
    actionTypeModelError,
    showLoadingSpinner,
    refetchConnectorSpec,
    isSpecConnector,
  ]);

  const renderConnectorRulesList = useCallback(() => {
    return <ConnectorRulesList connector={connector} />;
  }, [connector]);

  // This specific logic can be removed once inference connectors are no longer experimental. Tracked here https://github.com/elastic/kibana/issues/244985
  const isExperimental: boolean | undefined = useMemo(() => {
    if (
      connector &&
      'config' in connector &&
      connector.config?.inferenceId === '.rainbow-sprinkles-elastic'
    ) {
      return false;
    }
    return actionTypeModel?.isExperimental;
  }, [actionTypeModel, connector]);

  return (
    <>
      <FlyoutHeader
        isPreconfigured={connector.isPreconfigured}
        connectorName={connector.name}
        connectorTypeDesc={
          actionTypeModel?.selectMessagePreconfigured || actionTypeModel?.selectMessage || ''
        }
        setTab={handleSetTab}
        selectedTab={selectedTab}
        icon={icon ?? actionTypeModel?.iconClass}
        isExperimental={isExperimental}
        subFeature={actionTypeModel?.subFeature}
        isTestable={isTestable}
        hideRulesTab={hideRulesTab}
        docsUrl={actionTypeModel?.docsUrl}
      />
      <EuiFlyoutBody>
        {selectedTab === EditConnectorTabs.Configuration && renderConfigurationTab()}
        {selectedTab === EditConnectorTabs.Test && renderTestTab()}
        {selectedTab === EditConnectorTabs.Rules && renderConnectorRulesList()}
      </EuiFlyoutBody>
      <FlyoutFooter
        onClose={onCloseAttempt}
        isSaving={isSaving}
        isSaved={isSaved}
        disabled={disabled}
        showButtons={showButtons}
        onClickSave={onClickSave}
      />
      {showConfirmModal && (
        <EuiConfirmModal
          aria-labelledby={confirmModalTitleId}
          titleProps={{ id: confirmModalTitleId }}
          buttonColor="danger"
          data-test-subj="closeConnectorEditConfirm"
          title={i18n.translate(
            'xpack.triggersActionsUI.sections.confirmConnectorEditClose.title',
            {
              defaultMessage: 'Discard unsaved changes to connector?',
            }
          )}
          onCancel={() => {
            onConfirmModalCancel();
          }}
          onConfirm={onClose}
          cancelButtonText={i18n.translate(
            'xpack.triggersActionsUI.sections.confirmConnectorEditClose.cancelButtonLabel',
            {
              defaultMessage: 'Cancel',
            }
          )}
          confirmButtonText={i18n.translate(
            'xpack.triggersActionsUI.sections.confirmConnectorEditClose.discardButtonLabel',
            {
              defaultMessage: 'Discard Changes',
            }
          )}
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.confirmConnectorEditClose.confirmConnectorCloseMessage"
            defaultMessage="You can't recover unsaved changes."
          />
        </EuiConfirmModal>
      )}
    </>
  );
};

const EditConnectorFlyoutComponent: React.FC<EditConnectorFlyoutProps> = ({
  actionTypeRegistry,
  connector,
  onClose,
  tab = EditConnectorTabs.Configuration,
  onConnectorUpdated,
  icon,
  hideRulesTab = false,
}) => {
  const [isFormModified, setIsFormModified] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const onFlyoutClose = useCallback(() => {
    if (isFormModified) {
      setShowConfirmModal(true);
      return;
    }
    onClose();
  }, [isFormModified, onClose]);

  return (
    <EuiFlyout
      onClose={onFlyoutClose}
      aria-labelledby="flyoutActionEditTitle"
      size="m"
      data-test-subj="edit-connector-flyout"
    >
      <EditConnectorFlyoutContent
        actionTypeRegistry={actionTypeRegistry}
        connector={connector}
        onClose={onClose}
        tab={tab}
        onConnectorUpdated={onConnectorUpdated}
        icon={icon}
        hideRulesTab={hideRulesTab}
        isFormModified={isFormModified}
        onFormModifiedChange={setIsFormModified}
        onCloseAttempt={onFlyoutClose}
        showConfirmModal={showConfirmModal}
        onConfirmModalCancel={() => setShowConfirmModal(false)}
      />
    </EuiFlyout>
  );
};

export const EditConnectorFlyout = memo(EditConnectorFlyoutComponent);

// eslint-disable-next-line import/no-default-export
export { EditConnectorFlyout as default };
