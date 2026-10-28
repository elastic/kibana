/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const mcpFieldStrings = {
  serverUrl: {
    label: i18n.translate('xpack.stackConnectors.components.mcp.serverUrlLabel', {
      defaultMessage: 'Server URL',
    }),
  },
  additionalSettings: {
    label: i18n.translate('xpack.stackConnectors.components.mcp.additionalSettingsLabel', {
      defaultMessage: 'Additional settings',
    }),
  },
  authType: {
    label: i18n.translate('xpack.stackConnectors.components.mcp.authTypeLabel', {
      defaultMessage: 'Authentication',
    }),
  },
  authTypeNone: {
    label: i18n.translate('xpack.stackConnectors.components.mcp.authTypeNoneLabel', {
      defaultMessage: 'None',
    }),
    description: i18n.translate('xpack.stackConnectors.components.mcp.authTypeNoneDescription', {
      defaultMessage: 'No authentication. You can still send HTTP headers.',
    }),
  },
  authTypeOAuthAuthorizationCode: {
    label: i18n.translate(
      'xpack.stackConnectors.components.mcp.authTypeOAuthAuthorizationCodeLabel',
      {
        defaultMessage: 'OAuth 2.0 authorization code',
      }
    ),
    description: i18n.translate(
      'xpack.stackConnectors.components.mcp.authTypeOAuthAuthorizationCodeDescription',
      {
        defaultMessage: 'Each user authorizes the connector with their own account.',
      }
    ),
  },
  authorizationUrl: {
    label: i18n.translate('xpack.stackConnectors.components.mcp.authorizationUrlLabel', {
      defaultMessage: 'Authorization URL',
    }),
  },
  tokenUrl: {
    label: i18n.translate('xpack.stackConnectors.components.mcp.tokenUrlLabel', {
      defaultMessage: 'Token URL',
    }),
  },
  clientId: {
    label: i18n.translate('xpack.stackConnectors.components.mcp.clientIdLabel', {
      defaultMessage: 'Client ID',
    }),
  },
  clientSecret: {
    label: i18n.translate('xpack.stackConnectors.components.mcp.clientSecretLabel', {
      defaultMessage: 'Client secret',
    }),
  },
  scope: {
    label: i18n.translate('xpack.stackConnectors.components.mcp.scopeLabel', {
      defaultMessage: 'Scope',
    }),
    helpText: i18n.translate('xpack.stackConnectors.components.mcp.scopeHelpText', {
      defaultMessage: 'Optional. Space-separated scopes sent to the provider.',
    }),
  },
};

export const mcpErrorStrings = {
  required: (label: string) =>
    i18n.translate('xpack.stackConnectors.components.mcp.error.requireFieldText', {
      defaultMessage: `{label} is required.`,
      values: { label },
    }),
  invalid: (label: string) =>
    i18n.translate('xpack.stackConnectors.components.mcp.error.invalidURL', {
      defaultMessage: 'Invalid {label}',
      values: { label },
    }),
};

export const mcpParamsStrings = {
  subAction: {
    label: i18n.translate('xpack.stackConnectors.components.mcp.subActionLabel', {
      defaultMessage: 'Action',
    }),
  },
  params: {
    label: i18n.translate('xpack.stackConnectors.components.mcp.paramsLabel', {
      defaultMessage: 'Parameters',
    }),
  },
};

export const mcpParamsErrorStrings = {
  invalidJson: i18n.translate('xpack.stackConnectors.components.mcp.error.invalidJson', {
    defaultMessage: 'Parameters must be valid JSON.',
  }),
  required: i18n.translate('xpack.stackConnectors.components.mcp.error.required', {
    defaultMessage: 'Parameters are required.',
  }),
};
