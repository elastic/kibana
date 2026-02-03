/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';

import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  Form,
  useForm,
  useFormIsModified,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiSpacer } from '@elastic/eui';
import type { ConnectorFormSchema } from '@kbn/alerts-ui-shared';
import type { ActionTypeModel, ConnectorValidationFunc } from '../../../types';
import { ConnectorFormFields } from './connector_form_fields';
import { EncryptedFieldsCallout } from './encrypted_fields_callout';

export interface ConnectorFormState {
  isValid: boolean | undefined;
  isSubmitted: boolean;
  isSubmitting: boolean;
  submit: FormHook<ConnectorFormSchema>['submit'];
  preSubmitValidator: ConnectorValidationFunc | null;
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
}

const ConnectorFormComponent: React.FC<Props> = ({
  actionTypeModel,
  connector,
  isEdit,
  onChange,
  onFormModifiedChange,
  setResetForm,
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

  const registerPreSubmitValidator = useCallback((validator: ConnectorValidationFunc) => {
    setPreSubmitValidator(() => validator);
  }, []);

  const isFormModified = useFormIsModified({
    form,
    discard: ['__internal__', '__internal__.headers__array__'],
  });

  useEffect(() => {
    if (onChange) {
      onChange({ isValid: isFormValid, isSubmitted, isSubmitting, submit, preSubmitValidator });
    }
  }, [onChange, isFormValid, isSubmitted, isSubmitting, submit, preSubmitValidator]);

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
      <ConnectorFormFields
        actionTypeModel={actionTypeModel}
        isEdit={isEdit}
        registerPreSubmitValidator={registerPreSubmitValidator}
      />
      <EuiSpacer size="m" />
      <EncryptedFieldsCallout isEdit={isEdit} isMissingSecrets={connector.isMissingSecrets} />
    </Form>
  );
};

export const ConnectorForm = React.memo(ConnectorFormComponent);
