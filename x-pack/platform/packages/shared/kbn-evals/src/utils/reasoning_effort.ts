/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionReasoningEffort } from '@kbn/inference-common';
import { REASONING_EFFORT_LEVELS, isReasoningEffort } from '@kbn/inference-common';

/** Parses a run's requested reasoning effort, returning undefined when it's empty or unset. */
export const parseReasoningEffort = (
  value: string | undefined,
  source: '--reasoning-effort' | 'EVAL_REASONING_EFFORT'
): ChatCompletionReasoningEffort | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (!isReasoningEffort(trimmed)) {
    throw new Error(
      `${source} must be one of ${REASONING_EFFORT_LEVELS.join(', ')}, got "${value}".`
    );
  }

  return trimmed;
};

/** The reasoning effort requested through `EVAL_REASONING_EFFORT`, if any. */
export const getReasoningEffortFromEnv = (): ChatCompletionReasoningEffort | undefined =>
  parseReasoningEffort(process.env.EVAL_REASONING_EFFORT, 'EVAL_REASONING_EFFORT');
