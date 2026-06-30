/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collectStreamResults, createPipelineStream } from '../test_utils';
import type { RuleExecutionStep, RulePipelineState } from './types';

export async function getStepError(
  step: RuleExecutionStep,
  state: RulePipelineState
): Promise<Error | undefined> {
  try {
    await collectStreamResults(step.executeStream(createPipelineStream([state])));
    return undefined;
  } catch (error) {
    return error as Error;
  }
}

export * from '../test_utils';
