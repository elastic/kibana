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
    defaultMessage:
      'Welcome to your Elastic AI Assistant! I am your 100% open-source portal into your Elastic Life. ',
  }
);

export const LOAD_CONNECTORS_ERROR_MESSAGE = i18n.translate(
  'xpack.elasticAssistant.connectors.useLoadConnectors.errorMessage',
  {
    defaultMessage:
      'Welcome to your Elastic AI Assistant! I am your 100% open-source portal into your Elastic Life. ',
  }
);

export const WELCOME_SECURITY = i18n.translate(
  'xpack.elasticAssistant.content.prompts.welcome.welcomeSecurityPrompt',
  {
    defaultMessage:
      'Welcome to your Elastic AI Assistant! I am your 100% open-source portal into Elastic Security. ',
  }
);

export const CONNECTOR_SELECTOR_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.connectorSelector.ariaLabel',
  {
    defaultMessage: 'Conversation Selector',
  }
);

export const ADD_NEW_CONNECTOR = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.connectorSelector.newConnectorOptions',
  {
    defaultMessage: 'Add new Connector...',
  }
);

export const INLINE_CONNECTOR_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.connectorSelectorInline.connectorLabel',
  {
    defaultMessage: 'Connector:',
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

export const CONNECTOR_ADDED_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.addConnectorButton.connectorAddedTitle',
  {
    defaultMessage: 'Generative AI Connector added!',
  }
);

export const CONNECTOR_ADDED_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.addConnectorButton.connectorAddedDescription',
  {
    defaultMessage: 'Ready to continue the conversation...',
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
