/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionReasoning } from '@kbn/inference-common';

/**
 * Resolve the reasoning payload for a unified chat completion request.
 *
 * OpenAI Chat Completions rejects function tools when reasoning effort defaults
 * to anything other than `none` on newer reasoning models. When native tools are
 * present and the caller did not set reasoning, default to `{ effort: 'none' }`.
 * Explicit caller values always win.
 */
export const resolveChatCompletionReasoning = ({
  reasoning,
  hasNativeTools,
}: {
  reasoning?: ChatCompletionReasoning;
  hasNativeTools: boolean;
}): ChatCompletionReasoning | undefined => {
  if (reasoning) {
    return reasoning;
  }

  if (hasNativeTools) {
    return { effort: 'none' };
  }

  return undefined;
};
