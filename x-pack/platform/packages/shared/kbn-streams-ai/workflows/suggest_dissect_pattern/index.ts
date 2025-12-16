/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { SuggestDissectPatternPrompt } from './prompt';
import { dissectPatternSchema, type DissectPattern } from './schema';
import { schema } from './schema';

export async function suggestDissectPattern({
  logSamples,
  delimiterHints,
  guidance,
  inferenceClient,
  logger,
  signal,
}: {
  logSamples: string;
  delimiterHints?: string;
  guidance?: string;
  inferenceClient: BoundInferenceClient;
  logger: Logger;
  signal: AbortSignal;
}): Promise<DissectPattern> {
  const response = await executeAsReasoningAgent({
    inferenceClient,
    signal,
    logger,
    params: {
      prompt: SuggestDissectPatternPrompt.format({
        log_samples: logSamples,
        delimiter_hints: delimiterHints,
        guidance,
      }),
      schema,
    },
  });

  const parsed = dissectPatternSchema.parse(response.content);

  return parsed;
}
