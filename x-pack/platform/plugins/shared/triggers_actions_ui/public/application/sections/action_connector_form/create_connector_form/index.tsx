/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ConnectorFormSchema } from '@kbn/alerts-ui-shared';
import { useActionTypeModel } from '@kbn/alerts-ui-shared/src/common/hooks/use_action_type_model';
import type { ActionConnector, ActionTypeRegistryContract } from '../../../../types';
import { hasSaveActionsCapability } from '../../../lib/capabilities';
import { useKibana } from '../../../../common/lib/kibana';
import { useCreateConnector } from '../../../hooks/use_create_connector';
import type { ConnectorFormState } from '../connector_form';
import { ConnectorForm } from '../connector_form';

export interface CreateConnectorFormProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  /** The connector type to create. Pre-selected — no type picker is shown. */
  actionTypeId: string;
  /** Optional name to pre-fill into the form. */
  initialName?: string;
  /** Carried for provider parity (consumed by ConnectorProvider in the wrapper). */
  isServerless?: boolean;
  /** Reports validity/saving so a host (e.g. a flyout/canvas) can drive its own Save button. */
  onStateChange?: (status: CreateConnectorFormStatus) => void;
  /** Hands the host an imperative handle to submit the form. */
  onReady?: (handle: CreateConnectorFormHandle) => void;
}

export interface CreateConnectorFormStatus {
  /** Whether an external Save button should be disabled. */
  isSubmitDisabled: boolean;
  /** Whether a create is in flight (or the form is submitting). */
  isSaving: boolean;
}

export interface CreateConnectorFormHandle {
  /** Validate the form and create the connector. Resolves to the created connector, or undefined when invalid. */
  submit: () => Promise<ActionConnector | undefined>;
}

/**
 * A standalone connector creation form for a single, pre-selected connector
 * type. Unlike {@link CreateConnectorFlyout}, it renders no flyout chrome and no
 * type picker, so it can be embedded in another container (e.g. the Agent
 * Builder attachment canvas) without nesting a flyout/focus-trap.
 *
 * It reuses the same load-bearing pieces as the flyout: `useActionTypeModel`
 * (resolves stack or spec-based models), `ConnectorForm` (renders the type's
 * config/secret fields, validation, serializer), and `useCreateConnector`
 * (POSTs to the Actions API). Config and secrets go straight to that API and
 * never pass through the host.
 */
const CreateConnectorFormComponent: React.FC<CreateConnectorFormProps> = ({
  actionTypeRegistry,
  actionTypeId,
  initialName,
  onStateChange,
  onReady,
}) => {
  const {
    application: { capabilities },
    http,
    uiSettings,
  } = useKibana().services;
  const { isLoading: isSavingConnector, createConnector } = useCreateConnector();

  const isMounted = useRef(false);
  const canSave = hasSaveActionsCapability(capabilities);
  const [showFormErrors, setShowFormErrors] = useState(false);
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

  const {
    actionTypeModel,
    isLoading: isLoadingActionTypeModel,
    error: actionTypeModelError,
    refetch: refetchConnectorSpec,
  } = useActionTypeModel({ actionTypeRegistry, actionTypeId, http, uiSettings });

  // Delay the spinner so quick model loads don't flash a loading state.
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(false);
  useDebounce(() => setShowLoadingSpinner(isLoadingActionTypeModel), 300, [
    isLoadingActionTypeModel,
  ]);

  const defaultConnector = useMemo(
    () => ({
      actionTypeId,
      name: initialName ?? '',
      isDeprecated: false,
      config: {},
      secrets: {},
      isMissingSecrets: false,
    }),
    [actionTypeId, initialName]
  );

  const hasErrors = isFormValid === false;
  const isSaving = isSavingConnector || isSubmitting;
  const isSubmitDisabled =
    hasErrors || !canSave || isLoadingActionTypeModel || !!actionTypeModelError || !actionTypeModel;

  const validateAndCreateConnector = useCallback(async (): Promise<ActionConnector | undefined> => {
    setPreSubmitValidationErrorMessage(null);
    setShowFormErrors(false);

    const { isValid, data } = await submit();
    if (!isMounted.current) {
      return undefined;
    }

    if (isValid) {
      if (preSubmitValidator) {
        const validatorRes = await preSubmitValidator();
        if (validatorRes) {
          setPreSubmitValidationErrorMessage(validatorRes.message);
          return undefined;
        }
      }

      const { actionTypeId: typeId, name, config, secrets, id } = data;
      return createConnector({
        actionTypeId: typeId,
        name: name ?? '',
        config: config ?? {},
        secrets: secrets ?? {},
        id: id ?? '',
      });
    }

    setShowFormErrors(true);
    return undefined;
  }, [submit, preSubmitValidator, createConnector]);

  // Expose a stable handle whose submit always runs the latest logic.
  const submitRef = useRef(validateAndCreateConnector);
  useEffect(() => {
    submitRef.current = validateAndCreateConnector;
  }, [validateAndCreateConnector]);
  const handle = useMemo<CreateConnectorFormHandle>(
    () => ({ submit: () => submitRef.current() }),
    []
  );
  useEffect(() => {
    onReady?.(handle);
  }, [onReady, handle]);

  useEffect(() => {
    onStateChange?.({ isSubmitDisabled, isSaving });
  }, [onStateChange, isSubmitDisabled, isSaving]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleErrorFocus = useCallback((node: HTMLDivElement) => {
    node?.focus();
  }, []);

  return (
    <>
      {showLoadingSpinner && (
        <EuiFlexGroup
          direction="column"
          justifyContent="center"
          alignItems="center"
          style={{ minHeight: 200 }}
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.triggersActionsUI.createConnectorForm.loadingConfiguration', {
              defaultMessage: 'Loading connector configuration...',
            })}
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
            title={i18n.translate('xpack.triggersActionsUI.createConnectorForm.specLoadError', {
              defaultMessage: 'Failed to load connector configuration',
            })}
          >
            <p>
              {i18n.translate(
                'xpack.triggersActionsUI.createConnectorForm.specLoadErrorDescription',
                {
                  defaultMessage:
                    'The connector form could not be loaded. Try again, or contact your administrator if the problem persists.',
                }
              )}
            </p>
            <EuiSpacer size="s" />
            <EuiButton
              color="danger"
              data-test-subj="connector-spec-load-retry"
              onClick={() => refetchConnectorSpec()}
            >
              {i18n.translate('xpack.triggersActionsUI.createConnectorForm.specLoadErrorRetry', {
                defaultMessage: 'Retry',
              })}
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      {showFormErrors && (
        <>
          <EuiCallOut
            tabIndex={-1}
            announceOnMount
            ref={handleErrorFocus}
            size="s"
            color="danger"
            iconType="warning"
            data-test-subj="connector-form-header-error-label"
            role="alert"
            title={i18n.translate('xpack.triggersActionsUI.createConnectorForm.formErrorTitle', {
              defaultMessage: 'There are errors in the form',
            })}
          />
          <EuiSpacer size="m" />
        </>
      )}

      {!isLoadingActionTypeModel &&
        !showLoadingSpinner &&
        !actionTypeModelError &&
        actionTypeModel && (
          <>
            <ConnectorForm
              actionTypeModel={actionTypeModel}
              connector={defaultConnector}
              isEdit={false}
              onChange={setFormState}
            />
            {!!preSubmitValidationErrorMessage && <p>{preSubmitValidationErrorMessage}</p>}
          </>
        )}
    </>
  );
};

export const CreateConnectorForm = memo(CreateConnectorFormComponent);

// eslint-disable-next-line import/no-default-export
export { CreateConnectorForm as default };
