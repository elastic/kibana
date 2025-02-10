/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

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

export const CLOSE = i18n.translate(
  'xpack.elasticAssistant.assistant.assistantHeader.closeButtonLabel',
  {
    defaultMessage: 'Close',
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

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

export const ANONYMIZE_VALUES_TOOLTIP = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.anonymizeValues.tooltip',
  {
    values: { keyboardShortcut: isMac ? '⌥ + a' : 'Alt + a' },
    defaultMessage:
      'Toggle to reveal or hide field values in your chat stream. The data sent to the LLM is still anonymized based on settings in the Anonymization panel. Keyboard shortcut: {keyboardShortcut}',
  }
);

export const SHOW_CITATIONS_TOOLTIP = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.showCitationsLabel.tooltip',
  {
    values: { keyboardShortcut: isMac ? '⌥ + c' : 'Alt + c' },
    defaultMessage: 'Keyboard shortcut: {keyboardShortcut}',
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
