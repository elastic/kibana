/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Streams } from '@kbn/streams-schema';
import type { NaturalLanguageQuery } from '../queries/types';
import type { OnboardDashboardsWorkflowChange } from './types';

export async function generateDashboards({}: {
  definition: Streams.all.Definition;
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  start: number;
  end: number;
  signal: AbortSignal;
  queries: NaturalLanguageQuery[];
}): Promise<OnboardDashboardsWorkflowChange> {
  return {
    dashboards: [],
  };
}
