/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// config form
export const OAUTH_URL_LABEL = i18n.translate(
  'xpack.stackConnectors.security.MicrosoftDefenderEndpoint.config.oAuthUrlLabel',
  {
    defaultMessage: 'OAuth Server URL',
  }
);
export const OAUTH_SCOPE = i18n.translate(
  'xpack.stackConnectors.security.MicrosoftDefenderEndpoint.config.oAuthScope',
  {
    defaultMessage: 'OAuth scope',
  }
);
export const API_URL_LABEL = i18n.translate(
  'xpack.stackConnectors.security.MicrosoftDefenderEndpoint.config.apiUrlLabel',
  {
    defaultMessage: 'API URL',
  }
);

export const CLIENT_ID_LABEL = i18n.translate(
  'xpack.stackConnectors.security.MicrosoftDefenderEndpoint.config.clientIdLabel',
  {
    defaultMessage: 'Application client ID',
  }
);

export const CLIENT_SECRET_VALUE_LABEL = i18n.translate(
  'xpack.stackConnectors.security.MicrosoftDefenderEndpoint.config.clientSecretValueLabel',
  {
    defaultMessage: 'Client secret value',
  }
);

export const TENANT_ID_LABEL = i18n.translate(
  'xpack.stackConnectors.security.MicrosoftDefenderEndpoint.config.tenantIdLabel',
  {
    defaultMessage: 'Tenant ID',
  }
);

export const RUN_CONNECTOR_TEST_MESSAGE = i18n.translate(
  'xpack.stackConnectors.security.MicrosoftDefenderEndpoint.params.testMessage',
  { defaultMessage: "Run a test to validate the connector's configuration" }
);

export const ACTION_REQUIRED = i18n.translate(
  'xpack.stackConnectors.security.MicrosoftDefenderEndpoint.params.error.requiredActionText',
  {
    defaultMessage: 'Action is required.',
  }
);

export const INVALID_ACTION = i18n.translate(
  'xpack.stackConnectors.security.MicrosoftDefenderEndpoint.params.error.invalidActionText',
  {
    defaultMessage: 'Invalid action name.',
  }
);
