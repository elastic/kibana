/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AI_ASSISTANT_MENU = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.settingsContextMenu.aiAssistantMenuAriaLabel',
  {
    defaultMessage: 'Assistant settings menu',
  }
);

export const CONVO_ASSISTANT_MENU = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.settingsContextMenu.aiConvoMenuAriaLabel',
  {
    defaultMessage: 'Conversation settings menu',
  }
);

export const AI_ASSISTANT_SETTINGS = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.aiAssistantSettings',
  {
    defaultMessage: 'AI Assistant settings',
  }
);

export const ANONYMIZATION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.anonymization',
  {
    defaultMessage: 'Anonymization',
  }
);

export const KNOWLEDGE_BASE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBase',
  {
    defaultMessage: 'Knowledge Base',
  }
);

export const ALERTS_TO_ANALYZE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.alertsToAnalyze',
  {
    defaultMessage: 'Alerts to analyze',
  }
);

export const RESET_CONVERSATION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.resetConversation',
  {
    defaultMessage: 'Reset conversation',
  }
);

export const ANONYMIZE_VALUES = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.anonymizeValues',
  {
    defaultMessage: 'Show anonymized values',
  }
);

export const SHOW_CITATIONS = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.showCitationsLabel',
  {
    defaultMessage: 'Show citations',
  }
);

export const CHAT_OPTIONS = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.chatOptions.label',
  {
    defaultMessage: 'Chat options',
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

export const DUPLICATE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.conversation.duplicate',
  {
    defaultMessage: 'Duplicate',
  }
);
export const COPY_URL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.conversation.copyUrl',
  {
    defaultMessage: 'Copy URL',
  }
);
export const COPY_URL_SUCCESS = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.conversation.copySuccess',
  {
    defaultMessage: 'Conversation URL copied to clipboard',
  }
);
export const COPY_URL_ERROR = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.conversation.copyError',
  {
    defaultMessage: 'Could not copy conversation URL',
  }
);

export const DUPLICATE_SUCCESS = (title: string) =>
  i18n.translate('xpack.elasticAssistant.assistant.settings.conversation.duplicateSuccess', {
    defaultMessage: '{title} created successfully',
    values: { title },
  });

export const DUPLICATE_ERROR = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.conversation.duplicateError',
  {
    defaultMessage: 'Could not duplicate conversation',
  }
);
