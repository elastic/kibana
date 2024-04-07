/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ANONYMIZED_VALUES = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.anonymizedValues',
  {
    defaultMessage: 'Anonymized values',
  }
);

export const RESET_CONVERSATION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.resetConversation',
  {
    defaultMessage: 'Reset conversation',
  }
);

export const CONNECTOR_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.connectorTitle',
  {
    defaultMessage: 'Connector',
  }
);

export const SHOW_ANONYMIZED = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.showAnonymizedToggleLabel',
  {
    defaultMessage: 'Show anonymized',
  }
);

export const SHOW_REAL_VALUES = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.showAnonymizedToggleRealValuesLabel',
  {
    defaultMessage: 'Show real values',
  }
);

export const SHOW_ANONYMIZED_TOOLTIP = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.showAnonymizedTooltip',
  {
    defaultMessage: 'Show the anonymized values sent to and from the assistant',
  }
);

export const CANCEL_BUTTON_TEXT = i18n.translate(
  'xpack.elasticAssistant.assistant.resetConversationModal.cancelButtonText',
  {
    defaultMessage: 'Cancel',
  }
);

export const RESET_BUTTON_TEXT = i18n.translate(
  'xpack.elasticAssistant.assistant.resetConversationModal.resetButtonText',
  {
    defaultMessage: 'Reset',
  }
);

export const CLEAR_CHAT_CONFIRMATION = i18n.translate(
  'xpack.elasticAssistant.assistant.resetConversationModal.clearChatConfirmation',
  {
    defaultMessage:
      'Are you sure you want to clear the current chat? All conversation data will be lost.',
  }
);
