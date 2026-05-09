/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionTokenCount } from '@kbn/inference-common';

export const EMPTY_TOKENS: ChatCompletionTokenCount = {
  prompt: 0,
  completion: 0,
  total: 0,
  cached: 0,
};

export function sumTokens({
  accumulated = EMPTY_TOKENS,
  added,
}: {
  accumulated?: ChatCompletionTokenCount;
  added?: ChatCompletionTokenCount;
}): ChatCompletionTokenCount {
  return {
    completion: accumulated.completion + (added?.completion ?? 0),
    prompt: accumulated.prompt + (added?.prompt ?? 0),
    total: accumulated.total + (added?.total ?? 0),
    cached: (accumulated.cached ?? 0) + (added?.cached ?? 0),
  };
}
