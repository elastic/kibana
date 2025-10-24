/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const URL_LABEL = i18n.translate('xpack.stackConnectors.components.mcp.urlFieldLabel', {
  defaultMessage: 'URL',
});

export const UNIQUE_ID_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.uniqueIdFieldLabel',
  {
    defaultMessage: 'Unique ID',
  }
);

export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.descriptionFieldLabel',
  {
    defaultMessage: 'Description',
  }
);

export const AUTH_TYPE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.authTypeFieldLabel',
  {
    defaultMessage: 'Authorization type',
  }
);

export const API_KEY_OPTION_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.apiKeyOptionLabel',
  {
    defaultMessage: 'API key',
  }
);

export const NO_AUTH_OPTION_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.noAuthOptionLabel',
  {
    defaultMessage: 'No auth',
  }
);

export const BASIC_AUTH_OPTION_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.basicAuthOptionLabel',
  {
    defaultMessage: 'Basic',
  }
);

export const API_KEY_AUTH_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.apiKeyFieldLabel',
  {
    defaultMessage: 'API key',
  }
);

export const USERNAME_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.usernameFieldLabel',
  {
    defaultMessage: 'Username',
  }
);

export const PASSWORD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.passwordFieldLabel',
  {
    defaultMessage: 'Password',
  }
);

export const EVENT_ACTION_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.eventActionFieldLabel',
  {
    defaultMessage: 'Event action',
  }
);

// Auth configuration labels
export const HEADER_AUTH_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.headerAuthLabel',
  {
    defaultMessage: 'Header Authentication',
  }
);

export const AUTH_PRESET_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.authPresetLabel',
  {
    defaultMessage: 'Authentication Type',
  }
);

export const PRESET_NONE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.presetNoneLabel',
  {
    defaultMessage: 'None',
  }
);

export const PRESET_API_KEY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.presetApiKeyLabel',
  {
    defaultMessage: 'API Key',
  }
);

export const PRESET_BASIC_AUTH_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.presetBasicAuthLabel',
  {
    defaultMessage: 'Basic Authentication',
  }
);

export const PRESET_BEARER_TOKEN_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.presetBearerTokenLabel',
  {
    defaultMessage: 'Bearer Token',
  }
);

export const PRESET_CUSTOM_HEADERS_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.presetCustomHeadersLabel',
  {
    defaultMessage: 'Custom Headers',
  }
);

export const PRESET_OAUTH_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.presetOAuthLabel',
  {
    defaultMessage: 'OAuth 2.0 (Coming Soon)',
  }
);

export const TOKEN_LABEL = i18n.translate('xpack.stackConnectors.components.mcp.tokenLabel', {
  defaultMessage: 'Token',
});

export const BEARER_TOKEN_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.bearerTokenLabel',
  {
    defaultMessage: 'Bearer Token',
  }
);

export const HEADER_NAME_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.headerNameLabel',
  {
    defaultMessage: 'Header Name',
  }
);

export const HEADER_VALUE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.mcp.headerValueLabel',
  {
    defaultMessage: 'Header Value',
  }
);

export const ADD_HEADER_BUTTON = i18n.translate(
  'xpack.stackConnectors.components.mcp.addHeaderButton',
  {
    defaultMessage: 'Add Header',
  }
);

export const REMOVE_HEADER_BUTTON = i18n.translate(
  'xpack.stackConnectors.components.mcp.removeHeaderButton',
  {
    defaultMessage: 'Remove',
  }
);

// Test connection
export const TEST_CONNECTION_BUTTON = i18n.translate(
  'xpack.stackConnectors.components.mcp.testConnectionButton',
  {
    defaultMessage: 'Test Connection',
  }
);

export const TEST_CONNECTION_SUCCESS = i18n.translate(
  'xpack.stackConnectors.components.mcp.testConnectionSuccess',
  {
    defaultMessage: 'Connection successful',
  }
);

export const TEST_CONNECTION_FAILURE = i18n.translate(
  'xpack.stackConnectors.components.mcp.testConnectionFailure',
  {
    defaultMessage: 'Connection failed',
  }
);

export const TEST_CONNECTION_LOADING = i18n.translate(
  'xpack.stackConnectors.components.mcp.testConnectionLoading',
  {
    defaultMessage: 'Testing connection...',
  }
);

export const TOOLS_FOUND_MESSAGE = i18n.translate(
  'xpack.stackConnectors.components.mcp.toolsFoundMessage',
  {
    defaultMessage: '{count, plural, one {# tool} other {# tools}} available',
  }
);

// OneChat integration
export const ONECHAT_COMPATIBLE_BADGE = i18n.translate(
  'xpack.stackConnectors.components.mcp.oneChatCompatibleBadge',
  {
    defaultMessage: 'OneChat Compatible',
  }
);

export const ONECHAT_INFO_TITLE = i18n.translate(
  'xpack.stackConnectors.components.mcp.oneChatInfoTitle',
  {
    defaultMessage: 'Use with OneChat',
  }
);

export const ONECHAT_INFO_TEXT = i18n.translate(
  'xpack.stackConnectors.components.mcp.oneChatInfoText',
  {
    defaultMessage:
      'MCP connectors integrate with OneChat (Agent Builder) to provide external tools to AI agents. Tools from this connector will be available in the mcp.* namespace.',
  }
);

export const NAMESPACE_INFO = i18n.translate('xpack.stackConnectors.components.mcp.namespaceInfo', {
  defaultMessage: 'Tools will use the mcp.{connectorId}.* namespace',
});
