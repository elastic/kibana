/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { isEmpty } from 'lodash';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  Form,
  useForm,
  useFormIsModified,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiSpacer } from '@elastic/eui';
import type { ActionTypeModel, ConnectorValidationFunc } from '../../../types';
import { ConnectorFormFields } from './connector_form_fields';
import type { ConnectorFormSchema } from './types';
import { EncryptedFieldsCallout } from './encrypted_fields_callout';
import { connectorOverrides } from './connector_overrides';

export interface ConnectorFormState {
  isValid: boolean | undefined;
  isSubmitted: boolean;
  isSubmitting: boolean;
  submit: FormHook<ConnectorFormSchema>['submit'];
  preSubmitValidator: ConnectorValidationFunc | null;
}

interface InternalConnectorForm {
  __internal__?: {
    headers?: Array<{
      key: string;
      value: string;
      type: 'config' | 'secret';
    }>;
  };
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

interface SecretHeadersResponse {
  secretHeaders: Array<{ key: string; value: string }>;
}

const useSecretHeaders = (connectorId?: string) => {
  const { http } = useKibana<CoreStart>().services;
  const [secretHeaders, setSecretHeaders] = useState<
    Array<{ key: string; value: string; type: 'secret' }>
  >([]);

  const fetchData = useCallback(async () => {
    if (!connectorId) return;
    try {
      const response = await http.get<SecretHeadersResponse>(
        '/internal/stack_connectors/_secret_headers',
        { query: { connectorId } }
      );

      const headers = response.secretHeaders.map((header) => ({
        ...header,
        type: 'secret' as const,
      }));

      setSecretHeaders(headers);
    } catch (err) {
      setSecretHeaders([]);
      throw err;
    }
  }, [connectorId, http]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return secretHeaders;
};

/**
 * The serializer and deserializer are needed to transform the headers of
 * the webhook connectors. The webhook connector uses the UseArray component
 * to add dynamic headers to the form. The UseArray component formats the fields
 * as an array of objects. The schema for the headers of the webhook connector
 * is Record<string, string>. We need to transform the UseArray format to the one
 * accepted by the backend. At the moment, the UseArray does not accepts
 * a serializer and deserializer so it has to be done on the form level. When issue #133107
 * is resolved we should move the serializer and deserializer functions to the
 * webhook connector.
 */

// TODO: Remove when https://github.com/elastic/kibana/issues/133107 is resolved
const formDeserializer = (data: ConnectorFormSchema): ConnectorFormSchema => {
  const overrides = connectorOverrides(data.actionTypeId);
  if (overrides?.formDeserializer) {
    return overrides.formDeserializer(data);
  }

  if (
    data.actionTypeId !== '.webhook' &&
    data.actionTypeId !== '.cases-webhook' &&
    data.actionTypeId !== '.gen-ai'
  ) {
    return data;
  }

  const configHeaders = Object.entries(data?.config.headers ?? {}).map(([key, value]) => ({
    key,
    value,
    type: 'config' as const,
  }));

  return {
    ...(data as any),
    __internal__: {
      ...((data as any).__internal__ ?? {}),
      headers: configHeaders,
    },
  };
};

// TODO: Remove when https://github.com/elastic/kibana/issues/133107 is resolved
const formSerializer = (formData: ConnectorFormSchema): ConnectorFormSchema => {
  const overrides = connectorOverrides(formData.actionTypeId);
  if (overrides?.formSerializer) {
    return overrides.formSerializer(formData);
  }

  if (
    formData.actionTypeId !== '.webhook' &&
    formData.actionTypeId !== '.cases-webhook' &&
    formData.actionTypeId !== '.gen-ai'
  ) {
    return formData;
  }

  const webhookFormData = formData as {
    config: { headers?: Array<{ key: string; value: string }> };
    __internal__?: {
      headers?: Array<{
        key: string;
        value: string;
        type: 'config' | 'secret';
      }>;
    };
  };

  const headers = webhookFormData?.__internal__?.headers ?? [];

  const configHeaders = headers
    .filter((header) => header.type === 'config' && header.key)
    .reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

  const secretHeaders = headers
    .filter((header) => header.type === 'secret' && header.key)
    .reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

  return {
    ...formData,
    config: {
      ...formData.config,
      headers: isEmpty(configHeaders)
        ? formData.actionTypeId !== '.gen-ai'
          ? null
          : undefined
        : configHeaders,
    },
    secrets: {
      ...formData.secrets,
      secretHeaders: isEmpty(secretHeaders) ? undefined : secretHeaders,
    },
  };
};

const ConnectorFormComponent: React.FC<Props> = ({
  actionTypeModel,
  connector,
  isEdit,
  onChange,
  onFormModifiedChange,
  setResetForm,
}) => {
  const secretHeaders = useSecretHeaders(connector.id);
  const { form } = useForm({
    defaultValue: connector,
    serializer: formSerializer,
    deserializer: formDeserializer,
  });
  const { submit, isValid: isFormValid, isSubmitted, isSubmitting, reset } = form;
  const [preSubmitValidator, setPreSubmitValidator] = useState<ConnectorValidationFunc | null>(
    null
  );

  const [hasMergedSecretHeaders, setHasMergedSecretHeaders] = useState(false);

  const registerPreSubmitValidator = useCallback((validator: ConnectorValidationFunc) => {
    setPreSubmitValidator(() => validator);
  }, []);

  const isFormModified = useFormIsModified({
    form,
    discard: ['__internal__'],
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
    if (secretHeaders.length === 0 || hasMergedSecretHeaders) return;
    const currentFormData = form.getFormData() as InternalConnectorForm;

    const configHeaders = Object.keys(
      (connector.config?.headers ?? {}) as Record<string, string>
    ).map((key) => ({
      key,
      value: (connector.config?.headers as Record<string, string>)[key],
      type: 'config' as const,
    }));

    const mergedHeaders = [...configHeaders, ...secretHeaders].filter(Boolean);

    form.updateFieldValues(
      {
        ...currentFormData,
        __internal__: {
          ...currentFormData.__internal__,
          hasHeaders: mergedHeaders.length > 0,
          headers: mergedHeaders,
        },
      },
      { runDeserializer: false }
    );
    setHasMergedSecretHeaders(true);
  }, [secretHeaders, form, connector, hasMergedSecretHeaders]);

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
