/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Streams } from '@kbn/streams-schema';
import type { OnboardFieldDefinitionsWorkflowChange } from './types';

export async function generateFieldDefinitions({}: {
  definition: Streams.all.Definition;
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  start: number;
  end: number;
  signal: AbortSignal;
}): Promise<OnboardFieldDefinitionsWorkflowChange> {
  return {
    field_definitions: {},
  };
}
