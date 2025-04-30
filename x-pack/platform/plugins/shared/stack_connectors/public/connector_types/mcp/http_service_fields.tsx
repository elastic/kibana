/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiRadioGroupProps } from '@elastic/eui';
import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  MCP_CONNECTOR_AUTH_TYPE_API_KEY,
  MCP_CONNECTOR_AUTH_TYPE_BASIC,
  MCP_CONNECTOR_AUTH_TYPE_NONE,
} from '@kbn/mcp-connector-common';
import {
  ConfigFieldSchema,
  SecretsFieldSchema,
  SimpleConnectorForm,
} from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import {
  API_KEY_AUTH_LABEL,
  API_KEY_OPTION_LABEL,
  AUTH_TYPE_LABEL,
  BASIC_AUTH_OPTION_LABEL,
  NO_AUTH_OPTION_LABEL,
  PASSWORD_LABEL,
  URL_LABEL,
  USERNAME_LABEL,
  VERSION_LABEL,
} from './translations';
import { ConnectorFormData } from './types';

const CONFIG_SCHEMA: ConfigFieldSchema[] = [
  {
    id: 'service.http.url',
    label: URL_LABEL,
    isUrlField: true,
    isRequired: true,
    defaultValue: '',
  },
  { id: 'version', label: VERSION_LABEL, isRequired: false },
  {
    id: 'service.authType',
    label: AUTH_TYPE_LABEL,
    type: 'RADIO_GROUP',
    defaultValue: MCP_CONNECTOR_AUTH_TYPE_NONE,
    isRequired: true,
    euiFieldProps: {
      options: [
        {
          id: MCP_CONNECTOR_AUTH_TYPE_NONE,
          label: NO_AUTH_OPTION_LABEL,
        },
        {
          id: MCP_CONNECTOR_AUTH_TYPE_BASIC,
          label: BASIC_AUTH_OPTION_LABEL,
        },
        {
          id: MCP_CONNECTOR_AUTH_TYPE_API_KEY,
          label: API_KEY_OPTION_LABEL,
        },
      ] satisfies EuiRadioGroupProps['options'],
    },
  },
];

const NO_AUTH_SECRETS_SCHEMA: SecretsFieldSchema[] = [];

const API_KEY_SECRETS_SCHEMA: SecretsFieldSchema[] = [
  { id: 'auth.apiKey', label: API_KEY_AUTH_LABEL, isPasswordField: true },
];

const BASIC_AUTH_SECRETS_SCHEMA: SecretsFieldSchema[] = [
  { id: 'auth.username', label: USERNAME_LABEL, isPasswordField: false },
  { id: 'auth.password', label: PASSWORD_LABEL, isPasswordField: true },
];

export function HTTPServiceFields({ readOnly, isEdit }: { readOnly: boolean; isEdit: boolean }) {
  const [{ config, secrets }] = useFormData<ConnectorFormData>();
  const authType = config?.service?.authType || MCP_CONNECTOR_AUTH_TYPE_NONE;

  const secretsSchema: SecretsFieldSchema[] =
    authType === MCP_CONNECTOR_AUTH_TYPE_NONE
      ? NO_AUTH_SECRETS_SCHEMA
      : authType === MCP_CONNECTOR_AUTH_TYPE_BASIC
      ? BASIC_AUTH_SECRETS_SCHEMA
      : API_KEY_SECRETS_SCHEMA;

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <SimpleConnectorForm
            configFormSchema={CONFIG_SCHEMA}
            secretsFormSchema={secretsSchema}
            isEdit={isEdit}
            readOnly={readOnly}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
