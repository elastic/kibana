/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOAD_ACTIONS_ERROR_MESSAGE = i18n.translate(
  'xpack.elasticAssistant.connectors.useLoadActionTypes.errorMessage',
  {
    defaultMessage: 'An error occurred loading the Kibana Actions. ',
  }
);

export const LOAD_CONNECTORS_ERROR_MESSAGE = i18n.translate(
  'xpack.elasticAssistant.connectors.useLoadConnectors.errorMessage',
  {
    defaultMessage: 'An error occurred loading the Kibana Connectors. ',
  }
);

export const PRECONFIGURED_CONNECTOR = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.preconfiguredTitle',
  {
    defaultMessage: 'Preconfigured',
  }
);

export const CONNECTOR_SELECTOR_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.connectorSelector.ariaLabel',
  {
    defaultMessage: 'Connector Selector',
  }
);

export const ADD_NEW_CONNECTOR = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.connectorSelector.newConnectorOptions',
  {
    defaultMessage: 'Add new Connector...',
  }
);

export const ADD_CONNECTOR = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.connectorSelector.addConnectorButtonLabel',
  {
    defaultMessage: 'Add connector',
  }
);

export const INLINE_CONNECTOR_PLACEHOLDER = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.connectorSelectorInline.connectorPlaceholder',
  {
    defaultMessage: 'Select a Connector',
  }
);

export const ADD_CONNECTOR_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.addConnectorButton.title',
  {
    defaultMessage: 'Add Generative AI Connector',
  }
);

export const ADD_CONNECTOR_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.addConnectorButton.description',
  {
    defaultMessage: 'Configure a connector to continue the conversation',
  }
);

export const ADD_CONNECTOR_MISSING_PRIVILEGES_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.addConnectorButton.missingPrivilegesTitle',
  {
    defaultMessage: 'Generative AI Connector Required',
  }
);

export const ADD_CONNECTOR_MISSING_PRIVILEGES_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.addConnectorButton.missingPrivilegesDescription',
  {
    defaultMessage: 'Please contact your administrator to enable a Generative AI Connector.',
  }
);

export const CONNECTOR_SETUP_USER_YOU = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.setup.userYouTitle',
  {
    defaultMessage: 'You',
  }
);

export const CONNECTOR_SETUP_USER_ASSISTANT = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.setup.userAssistantTitle',
  {
    defaultMessage: 'Assistant',
  }
);

export const CONNECTOR_SETUP_TIMESTAMP_AT = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.setup.timestampAtTitle',
  {
    defaultMessage: 'at',
  }
);

export const CONNECTOR_SETUP_SKIP = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.setup.skipTitle',
  {
    defaultMessage: 'Click to skip...',
  }
);

export const MISSING_CONNECTOR_CALLOUT_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.connectorMissingCallout.calloutTitle',
  {
    defaultMessage: 'The current conversation is missing a connector configuration',
  }
);

export const MISSING_CONNECTOR_CONVERSATION_SETTINGS_LINK = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.connectorMissingCallout.conversationSettingsLink',
  {
    defaultMessage: 'Conversation Settings',
  }
);

export const CREATE_CONNECTOR_BUTTON = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.createConnectorButton',
  {
    defaultMessage: 'Connector',
  }
);

export const REFRESH_CONNECTORS_BUTTON = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.refreshConnectorsButton',
  {
    defaultMessage: 'Refresh',
  }
);
