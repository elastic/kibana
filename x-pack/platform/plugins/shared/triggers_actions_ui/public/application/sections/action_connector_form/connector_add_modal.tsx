/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiModal,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiFlexItem,
  EuiIcon,
  EuiFlexGroup,
  EuiBetaBadge,
  EuiButtonGroup,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ConnectorFormSchema } from '@kbn/alerts-ui-shared';
import { useActionTypeModel } from '@kbn/alerts-ui-shared';
import { TECH_PREVIEW_DESCRIPTION, TECH_PREVIEW_LABEL } from '../translations';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import type {
  ActionType,
  ActionConnector,
  ActionTypeRegistryContract,
  ActionTypeModel,
  ActionTypeIndex,
} from '../../../types';
import { useKibana } from '../../../common/lib/kibana';
import { useCreateConnector } from '../../hooks/use_create_connector';
import type { ConnectorFormState, ResetForm } from './connector_form';
import { ConnectorForm } from './connector_form';
import { loadActionTypes } from '../../lib/action_connector_api';
import { SectionLoading } from '../../components';

export interface ConnectorAddModalProps {
  actionType: ActionType;
  onClose: () => void;
  postSaveEventHandler?: (savedAction: ActionConnector) => void;
  actionTypeRegistry: ActionTypeRegistryContract;
}

const ConnectorAddModal = ({
  actionType: tempActionType,
  onClose,
  postSaveEventHandler,
  actionTypeRegistry,
}: ConnectorAddModalProps) => {
  const {
    application: { capabilities },
    http,
    uiSettings,
    notifications: { toasts },
  } = useKibana().services;
  const [actionType, setActionType] = useState<ActionType>(tempActionType);
  const [loadingActionTypes, setLoadingActionTypes] = useState<boolean>(false);
  const [allActionTypes, setAllActionTypes] = useState<ActionTypeIndex | undefined>(undefined);
  const { isLoading: isSavingConnector, createConnector } = useCreateConnector();
  const isMounted = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [initialConnector, setInitialConnector] = useState({
    actionTypeId: actionType?.id ?? '',
    isDeprecated: false,
    config: {},
    secrets: {},
    isMissingSecrets: false,
    isConnectorTypeDeprecated: false,
  });

  const canSave = hasSaveActionsCapability(capabilities);
  const {
    actionTypeModel,
    isLoading: isLoadingActionTypeModel,
    error: actionTypeModelError,
    refetch: refetchConnectorSpec,
  } = useActionTypeModel({ actionTypeRegistry, actionType, http, uiSettings });

  const groupActionTypeModel: Array<ActionTypeModel & { name: string }> = actionTypeModel
    ? (actionTypeModel?.subtype ?? [])
        .filter((item) => allActionTypes?.[item.id]?.enabledInConfig)
        .flatMap((subtypeAction) => {
          if (!actionTypeRegistry.has(subtypeAction.id)) {
            return [];
          }
          return [
            {
              ...actionTypeRegistry.get(subtypeAction.id),
              name: subtypeAction.name,
            },
          ];
        })
    : [];

  const groupActionButtons =
    groupActionTypeModel?.length > 1
      ? groupActionTypeModel.map((gAction) => ({
          id: gAction.id,
          label: gAction.name,
          'data-test-subj': `${gAction.id}Button`,
        }))
      : [];

  const resetConnectorForm = useRef<ResetForm | undefined>();

  const setResetForm = (reset: ResetForm) => {
    resetConnectorForm.current = reset;
  };

  const onChangeGroupAction = (id: string) => {
    if (allActionTypes && allActionTypes[id]) {
      setActionType(allActionTypes[id]);
      setInitialConnector({
        actionTypeId: id,
        isDeprecated: false,
        config: {},
        secrets: {},
        isMissingSecrets: false,
        isConnectorTypeDeprecated: false,
      });
      if (resetConnectorForm.current) {
        resetConnectorForm.current({
          resetValues: true,
          defaultValue: {
            actionTypeId: id,
            isDeprecated: false,
            config: {},
            secrets: {},
          },
        });
      }
    }
  };

  const [preSubmitValidationErrorMessage, setPreSubmitValidationErrorMessage] =
    useState<ReactNode>(null);

  const [formState, setFormState] = useState<ConnectorFormState>({
    isSubmitted: false,
    isSubmitting: false,
    isValid: undefined,
    submit: async () => ({ isValid: false, data: {} as ConnectorFormSchema }),
    preSubmitValidator: null,
  });

  const { preSubmitValidator, submit, isValid: isFormValid, isSubmitting } = formState;
  const hasErrors = isFormValid === false;
  const isSaving = isSavingConnector || isSubmitting;
  const registeredActionTypeModel = actionTypeRegistry.has(actionType.id)
    ? actionTypeRegistry.get(actionType.id)
    : undefined;

  const validateAndCreateConnector = useCallback(async () => {
    setPreSubmitValidationErrorMessage(null);

    const { isValid, data } = await submit();

    if (!isMounted.current) {
      // User has closed the modal meanwhile submitting the form
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

      const { actionTypeId, name, config, secrets, id } = data;
      const validConnector = { actionTypeId, name: name ?? '', config, secrets, id: id ?? '' };

      const createdConnector = await createConnector(validConnector);
      return createdConnector;
    } else {
      // point the user to the first invalid field
      const container = containerRef.current;
      if (!container) return;

      const selector = 'input[aria-invalid="true"]';
      const firstInputInvalid = container.querySelector<HTMLInputElement>(selector);

      if (firstInputInvalid) {
        window.requestAnimationFrame(() => {
          firstInputInvalid.focus({ preventScroll: false });
        });
      }
    }
  }, [submit, preSubmitValidator, createConnector]);

  const closeModal = useCallback(() => {
    onClose();
  }, [onClose]);

  const onSubmit = useCallback(async () => {
    const createdConnector = await validateAndCreateConnector();
    if (createdConnector) {
      closeModal();

      if (postSaveEventHandler) {
        postSaveEventHandler(createdConnector);
      }
    }
  }, [validateAndCreateConnector, closeModal, postSaveEventHandler]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoadingActionTypes(true);
        const availableActionTypes = await loadActionTypes({ http });

        const index: ActionTypeIndex = {};
        for (const actionTypeItem of availableActionTypes) {
          index[actionTypeItem.id] = actionTypeItem;
        }
        setAllActionTypes(index);
      } catch (e) {
        if (toasts) {
          toasts.addDanger({
            title: i18n.translate(
              'xpack.triggersActionsUI.sections.actionsConnectorsList.unableToLoadConnectorTypesMessage',
              { defaultMessage: 'Unable to load connector types' }
            ),
          });
        }
      } finally {
        setLoadingActionTypes(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiModal
      className="actConnectorModal"
      css={css`
        z-index: 9000;
        width: ${registeredActionTypeModel?.modalWidth ?? 600}px;
        overflow-y: auto;
      `}
      data-test-subj="connectorAddModal"
      onClose={closeModal}
      aria-labelledby={modalTitleId}
    >
      <div ref={containerRef}>
        <EuiModalHeader>
          <EuiFlexGroup gutterSize="m" alignItems="center">
            {actionTypeModel && actionTypeModel.iconClass ? (
              <EuiFlexItem grow={false}>
                <EuiIcon type={actionTypeModel.iconClass} size="xl" />
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" justifyContent="center" alignItems="center">
                <EuiFlexItem>
                  <EuiModalHeaderTitle id={modalTitleId} size="s" component="h3">
                    <FormattedMessage
                      defaultMessage="{actionTypeName} connector"
                      id="xpack.triggersActionsUI.sections.addModalConnectorForm.flyoutTitle"
                      values={{
                        actionTypeName: actionType.name,
                      }}
                    />
                  </EuiModalHeaderTitle>
                </EuiFlexItem>
                {actionTypeModel && actionTypeModel.isExperimental && (
                  <EuiFlexItem className="betaBadgeFlexItem" grow={false}>
                    <EuiBetaBadge
                      data-test-subj="betaBadge"
                      label={TECH_PREVIEW_LABEL}
                      tooltipContent={TECH_PREVIEW_DESCRIPTION}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalHeader>

        <EuiModalBody>
          {loadingActionTypes || isLoadingActionTypeModel ? (
            <SectionLoading>
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.connectorAddModal.loadingConnectorTypesDescription"
                defaultMessage="Loading connector…"
              />
            </SectionLoading>
          ) : (
            <>
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
                        'xpack.triggersActionsUI.sections.actionConnectorAdd.specLoadErrorDescription',
                        {
                          defaultMessage:
                            'There was an error loading the connector configuration. Check your connection and try again.',
                        }
                      )}
                    </p>
                    <EuiSpacer size="s" />
                    <EuiButton
                      data-test-subj="connector-spec-load-retry"
                      onClick={() => refetchConnectorSpec()}
                    >
                      {i18n.translate(
                        'xpack.triggersActionsUI.sections.actionConnectorAdd.specLoadErrorRetry',
                        { defaultMessage: 'Retry' }
                      )}
                    </EuiButton>
                  </EuiCallOut>
                  <EuiSpacer size="m" />
                </>
              )}
              {!actionTypeModelError && (
                <>
                  {groupActionTypeModel && (
                    <>
                      <EuiButtonGroup
                        isFullWidth
                        buttonSize="m"
                        color="primary"
                        legend={i18n.translate(
                          'xpack.triggersActionsUI.sections.connectorAddModal.subtypeGroupLegend',
                          { defaultMessage: 'Connector subtype' }
                        )}
                        options={groupActionButtons}
                        idSelected={actionType.id}
                        onChange={onChangeGroupAction}
                        data-test-subj="slackTypeChangeButton"
                      />
                      <EuiSpacer size="xs" />
                    </>
                  )}
                  <ConnectorForm
                    actionTypeModel={actionTypeModel}
                    connector={initialConnector}
                    isEdit={false}
                    onChange={setFormState}
                    setResetForm={setResetForm}
                  />
                  {preSubmitValidationErrorMessage}
                </>
              )}
            </>
          )}
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButtonEmpty onClick={closeModal} isLoading={isSaving}>
            {i18n.translate(
              'xpack.triggersActionsUI.sections.addModalConnectorForm.cancelButtonLabel',
              {
                defaultMessage: 'Cancel',
              }
            )}
          </EuiButtonEmpty>
          {canSave ? (
            <EuiButton
              fill
              color="primary"
              data-test-subj="saveActionButtonModal"
              type="submit"
              iconType="check"
              isLoading={isSaving}
              disabled={hasErrors || isLoadingActionTypeModel || !!actionTypeModelError}
              onClick={onSubmit}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.addModalConnectorForm.saveButtonLabel"
                defaultMessage="Save"
              />
            </EuiButton>
          ) : null}
        </EuiModalFooter>
      </div>
    </EuiModal>
  );
};

// eslint-disable-next-line import/no-default-export
export { ConnectorAddModal as default };
