/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DEFAULT_SYSTEM_PROMPT_NAME = i18n.translate(
  'xpack.elasticAssistant.assistant.content.prompts.system.defaultSystemPromptName',
  {
    defaultMessage: 'Default system prompt',
  }
);

export const SYSTEM_PROMPT_CONTEXT_NON_I18N = (context: string) => {
  return `CONTEXT:\n"""\n${context}\n"""`;
};
