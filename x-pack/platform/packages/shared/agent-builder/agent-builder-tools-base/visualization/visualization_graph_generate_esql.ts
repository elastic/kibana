/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ScopedModel, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';

/**
 * Parameters passed from the visualization graph to the shared `generateEsql` implementation
 * (typically @kbn/agent-builder-genai-utils `generateEsql`).
 */
export interface VisualizationGraphGenerateEsqlParams {
  nlQuery: string;
  index?: string;
  model: ScopedModel;
  events: ToolEventEmitter;
  logger: Logger;
  esClient: ElasticsearchClient;
  additionalInstructions?: string;
}

export interface VisualizationGraphGenerateEsqlResult {
  query?: string;
}

export type VisualizationGraphGenerateEsql = (
  params: VisualizationGraphGenerateEsqlParams
) => Promise<VisualizationGraphGenerateEsqlResult>;
