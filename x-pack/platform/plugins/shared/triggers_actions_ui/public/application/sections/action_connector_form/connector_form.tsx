/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useState } from 'react';

import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  Form,
  useForm,
  useFormData,
  useFormIsModified,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiSpacer } from '@elastic/eui';
import { RUN_ACTIONS_FIELD_PATH, type ConnectorFormSchema } from '@kbn/alerts-ui-shared';
import { connectorTypePublishesKeys } from '@kbn/connector-specs';
import type { ActionTypeModel, ConnectorValidationFunc } from '../../../types';
import { ConnectorFormFields } from './connector_form_fields';
import { ConnectorPublicKeys } from './connector_public_keys';
import { EncryptedFieldsCallout } from './encrypted_fields_callout';

export interface ConnectorFormState {
  isValid: boolean | undefined;
  isSubmitted: boolean;
  isSubmitting: boolean;
  submit: FormHook<ConnectorFormSchema>['submit'];
  preSubmitValidator: ConnectorValidationFunc | null;
  /** True when the Run actions switch is present and off, so outbound test cannot succeed. */
  runActionsOff: boolean;
}

export type ResetForm = (
  options?:
    | {
        resetValues?: boolean | undefined;
        defaultValue?:
          | Partial<ConnectorFormSchema<Record<string, unknown>, Record<string, unknown>>>
          | undefined;
      }
    | undefined
) => void;

interface Props {
  actionTypeModel: ActionTypeModel | null;
  connector: ConnectorFormSchema & { isMissingSecrets: boolean };
  isEdit: boolean;
  /** Handler to receive state changes updates */
  onChange?: (state: ConnectorFormState) => void;
  /** Handler to receive update on the form "isModified" state */
  onFormModifiedChange?: (isModified: boolean) => void;
  setResetForm?: (value: ResetForm) => void;
  /** Optional content rendered under Connector settings (e.g. inbound webhook URL). */
  settingsContent?: ReactNode;
  /** The add modal creates and closes, so it cannot reveal a one-time ingest token. */
  showInboundEvents?: boolean;
}

/** Reports the Run actions switch so flyouts can hide test controls that require outbound keys. */
const RunActionsOffReporter: React.FC<{ onRunActionsOff: (off: boolean) => void }> = ({
  onRunActionsOff,
}) => {
  const [{ __internal__: internalFields }] = useFormData<{
    __internal__?: { runActions?: boolean };
  }>({ watch: [RUN_ACTIONS_FIELD_PATH] });
  const runActionsOff = internalFields?.runActions === false;

  useEffect(() => {
    onRunActionsOff(runActionsOff);
  }, [onRunActionsOff, runActionsOff]);

  return null;
};

const ConnectorFormComponent: React.FC<Props> = ({
  actionTypeModel,
  connector,
  isEdit,
  onChange,
  onFormModifiedChange,
  setResetForm,
  settingsContent,
  showInboundEvents = true,
}) => {
  const { form } = useForm({
    defaultValue: connector,
    serializer: actionTypeModel?.connectorForm?.serializer,
    deserializer: actionTypeModel?.connectorForm?.deserializer,
  });

  const { submit, isValid: isFormValid, isSubmitted, isSubmitting, reset } = form;
  const [preSubmitValidator, setPreSubmitValidator] = useState<ConnectorValidationFunc | null>(
    null
  );
  const [runActionsOff, setRunActionsOff] = useState(false);

  const registerPreSubmitValidator = useCallback((validator: ConnectorValidationFunc) => {
    setPreSubmitValidator(() => validator);
  }, []);

  const isFormModified = useFormIsModified({
    form,
    discard: ['__internal__', '__internal__.headers__array__'],
  });

  useEffect(() => {
    if (onChange) {
      onChange({
        isValid: isFormValid,
        isSubmitted,
        isSubmitting,
        submit,
        preSubmitValidator,
        runActionsOff,
      });
    }
  }, [onChange, isFormValid, isSubmitted, isSubmitting, submit, preSubmitValidator, runActionsOff]);

  useEffect(() => {
    if (onFormModifiedChange) {
      onFormModifiedChange(isFormModified);
    }
  }, [isFormModified, onFormModifiedChange]);

  useEffect(() => {
    if (setResetForm) {
      setResetForm(reset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset]);

  return (
    <Form form={form}>
      <RunActionsOffReporter onRunActionsOff={setRunActionsOff} />
      <ConnectorFormFields
        actionTypeModel={actionTypeModel}
        isEdit={isEdit}
        registerPreSubmitValidator={registerPreSubmitValidator}
        authMode={connector.authMode}
        settingsContent={
          connectorTypePublishesKeys(connector.actionTypeId) ? (
            <>
              {settingsContent}
              <ConnectorPublicKeys
                connectorTypeId={connector.actionTypeId}
                connectorId={connector.id}
              />
            </>
          ) : (
            settingsContent
          )
        }
        showInboundEvents={showInboundEvents}
        savedIsInboundEventsEnabled={connector.isInboundEventsEnabled === true}
      />
      <EuiSpacer size="m" />
      <EncryptedFieldsCallout isEdit={isEdit} isMissingSecrets={connector.isMissingSecrets} />
    </Form>
  );
};

export const ConnectorForm = React.memo(ConnectorFormComponent);
