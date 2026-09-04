/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type OpenAI from 'openai';
import type { ChatCompletionReasoning } from '@kbn/inference-common';

export type OpenAIRequest = Omit<OpenAI.ChatCompletionCreateParams, 'model'> & {
  model?: string;
  /**
   * Elasticsearch unified chat completion reasoning config (not OpenAI's `reasoning_effort`).
   * Forwarded to `_inference/chat_completion` for provider translation.
   */
  reasoning?: ChatCompletionReasoning;
};

// duplicated from x-pack/platform/plugins/shared/stack_connectors/common/openai/constants.ts
// because depending on stack_connectors from the inference plugin creates a cyclic dependency...
export enum OpenAiProviderType {
  OpenAi = 'OpenAI',
  AzureAi = 'Azure OpenAI',
  Other = 'Other',
}
