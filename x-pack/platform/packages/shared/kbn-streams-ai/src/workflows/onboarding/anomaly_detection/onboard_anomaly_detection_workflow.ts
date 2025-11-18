/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { generateAnomalyDetectionJobs } from './generate_anomaly_detection_jobs';
import type {
  OnboardAnomalyDetectionWorkflowApplyResult,
  OnboardAnomalyDetectionWorkflowGenerateResult,
  OnboardAnomalyDetectionWorkflowInput,
} from './types';
import type { StreamWorkflow } from '../../types';

export const onboardAnomalyDetectionJobsWorkflow: StreamWorkflow<
  Streams.all.Model,
  OnboardAnomalyDetectionWorkflowInput,
  OnboardAnomalyDetectionWorkflowGenerateResult,
  OnboardAnomalyDetectionWorkflowApplyResult
> = {
  async generate(context, input) {
    const response = await generateAnomalyDetectionJobs({
      definition: input.stream.definition,
      start: context.start,
      end: context.end,
      esClient: context.esClient,
      inferenceClient: context.inferenceClient,
      logger: context.logger,
      queries: input.queries,
      signal: context.signal,
    });

    return {
      change: {
        jobs: response.jobs,
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
