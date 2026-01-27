/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionTokenCount } from '@kbn/inference-common';

export function sumTokens(
  a: ChatCompletionTokenCount,
  b?: ChatCompletionTokenCount
): ChatCompletionTokenCount {
  return {
    completion: a.completion + (b?.completion ?? 0),
    prompt: a.prompt + (b?.prompt ?? 0),
    total: a.total + (b?.total ?? 0),
    cached: (a.cached ?? 0) + (b?.cached ?? 0),
  };
}
