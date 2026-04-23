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
  total = EMPTY_TOKENS,
  added,
}: {
  total?: ChatCompletionTokenCount;
  added?: ChatCompletionTokenCount;
}): ChatCompletionTokenCount {
  return {
    completion: total.completion + (added?.completion ?? 0),
    prompt: total.prompt + (added?.prompt ?? 0),
    total: total.total + (added?.total ?? 0),
    cached: (total.cached ?? 0) + (added?.cached ?? 0),
  };
}
