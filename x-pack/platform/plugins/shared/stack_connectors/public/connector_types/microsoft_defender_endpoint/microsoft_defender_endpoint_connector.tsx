/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  ActionConnectorFieldsProps,
  ConfigFieldSchema,
  SecretsFieldSchema,
  SimpleConnectorForm,
} from '@kbn/triggers-actions-ui-plugin/public';
import * as translations from './translations';

const configFormSchema: ConfigFieldSchema[] = [
  {
    id: 'clientId',
    label: translations.CLIENT_ID_LABEL,
    isRequired: true,
  },
  {
    id: 'tenantId',
    label: translations.TENANT_ID_LABEL,
    isRequired: true,
  },
  {
    id: 'oAuthServerUrl',
    label: translations.OAUTH_URL_LABEL,
    isRequired: true,
    isUrlField: true,
    defaultValue: 'https://login.microsoftonline.com',
  },
  {
    id: 'oAuthScope',
    label: translations.OAUTH_SCOPE,
    isRequired: true,
    defaultValue: 'https://securitycenter.onmicrosoft.com/windowsatpservice/.default',
  },
  {
    id: 'apiUrl',
    label: translations.API_URL_LABEL,
    isUrlField: true,
    isRequired: true,
    defaultValue: 'https://api.securitycenter.windows.com',
  },
];

const secretsFormSchema: SecretsFieldSchema[] = [
  {
    id: 'clientSecret',
    label: translations.CLIENT_SECRET_VALUE_LABEL,
    isPasswordField: true,
  },
];

const MicrosoftDefenderEndpointActionConnectorFields: React.FunctionComponent<
  ActionConnectorFieldsProps
> = ({ readOnly, isEdit }) => (
  <SimpleConnectorForm
    isEdit={isEdit}
    readOnly={readOnly}
    configFormSchema={configFormSchema}
    secretsFormSchema={secretsFormSchema}
  />
);

// eslint-disable-next-line import/no-default-export
export { MicrosoftDefenderEndpointActionConnectorFields as default };
