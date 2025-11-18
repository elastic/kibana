/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type {
  OnboardSLOsWorkflowApplyResult,
  OnboardSLOsWorkflowGenerateResult,
  OnboardSLOsWorkflowInput,
} from './types';
import type { StreamWorkflow } from '../../types';

export const onboardSLOsWorkflow: StreamWorkflow<
  Streams.all.Model,
  OnboardSLOsWorkflowInput,
  OnboardSLOsWorkflowGenerateResult,
  OnboardSLOsWorkflowApplyResult
> = {
  async generate(context, input) {
    return {
      change: {
        slos: [],
      },
    };
  },
  async apply(context, input, change) {
    return {
      status: 'success',
      stream: input.stream,
    };
  },
};
