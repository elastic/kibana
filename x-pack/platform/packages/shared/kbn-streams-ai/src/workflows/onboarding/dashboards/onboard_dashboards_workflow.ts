/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { generateDashboards } from './generate_dashboards';
import type {
  OnboardDashboardsWorkflowApplyResult,
  OnboardDashboardsWorkflowGenerateResult,
  OnboardDashboardsWorkflowInput,
} from './types';
import type { StreamWorkflow } from '../../types';

export const onboardDashboardsWorkflow: StreamWorkflow<
  Streams.all.Model,
  OnboardDashboardsWorkflowInput,
  OnboardDashboardsWorkflowGenerateResult,
  OnboardDashboardsWorkflowApplyResult
> = {
  async generate(context, input) {
    const response = await generateDashboards({
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
        dashboards: response.dashboards,
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
