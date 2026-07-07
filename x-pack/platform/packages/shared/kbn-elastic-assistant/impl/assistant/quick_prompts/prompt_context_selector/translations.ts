/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PROMPT_CONTEXT_SELECTOR = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPrompts.promptContextSelector.ariaLabel',
  {
    defaultMessage: 'Select Prompt Context categories this Quick Prompt will be available for.',
  }
);

export const PROMPT_CONTEXT_SELECTOR_PREFIX = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPrompts.promptContextSelector.prefixLabel',
  {
    defaultMessage: 'Select Prompt',
  }
);

export const PROMPT_CONTEXT_SELECTOR_PLACEHOLDER = i18n.translate(
  'xpack.elasticAssistant.assistant.quickPrompts.promptContextSelector.placeholderLabel',
  {
    defaultMessage: '(Quick Prompt will always be visible).',
  }
);
