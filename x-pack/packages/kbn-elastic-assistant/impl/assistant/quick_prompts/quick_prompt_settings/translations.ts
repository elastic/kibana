/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SETTINGS_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPrompts.settings.settingsTitle',
  {
    defaultMessage: 'Quick Prompts',
  }
);

export const SETTINGS_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPrompts.settings.settingsDescription',
  {
    defaultMessage:
      'Create and manage Quick Prompts. Quick Prompts are shortcuts to common actions.',
  }
);

export const QUICK_PROMPT_NAME = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPrompts.settings.nameLabel',
  {
    defaultMessage: 'Name',
  }
);

export const QUICK_PROMPT_PROMPT = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPrompts.settings.promptLabel',
  {
    defaultMessage: 'Prompt',
  }
);

export const QUICK_PROMPT_PROMPT_PLACEHOLDER = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPrompts.settings.promptPlaceholder',
  {
    defaultMessage: 'Enter a Quick Prompt',
  }
);

export const QUICK_PROMPT_BADGE_COLOR = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPrompts.settings.badgeColorLabel',
  {
    defaultMessage: 'Badge color',
  }
);

export const QUICK_PROMPT_CONTEXTS = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPrompts.settings.contextsLabel',
  {
    defaultMessage: 'Contexts',
  }
);

export const QUICK_PROMPT_CONTEXTS_HELP_TEXT = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPrompts.settings.contextsHelpText',
  {
    defaultMessage:
      'Select where this Quick Prompt will appear. Selecting none will make this prompt appear everywhere.',
  }
);

export const CANCEL = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPrompts.modalCancelButtonTitle',
  {
    defaultMessage: 'Cancel',
  }
);

export const SAVE = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPrompts.modalSaveButtonTitle',
  {
    defaultMessage: 'Save',
  }
);
