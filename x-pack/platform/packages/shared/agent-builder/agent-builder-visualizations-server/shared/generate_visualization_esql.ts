/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import type { TimeRange } from '@kbn/agent-builder-common';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { generateEsql } from '@kbn/agent-builder-genai-utils';
import { esqlAdditionalInstructions } from './esql_instructions';

/** Normalized result of resolving an ES|QL query for a visualization. */
export interface GeneratedVisualizationEsql {
  /** The generated query. Absent when generation failed. */
  query?: string;
  /**
   * Result columns from the validation run, when `generateEsql` executed the
   * query and returned rows. Callers that author around the result schema (Vega)
   * can reuse these instead of executing the query again.
   */
  columns?: EsqlEsqlColumnInfo[];
  /** Populated when no usable query could be resolved. */
  error?: string;
}

export interface GenerateVisualizationEsqlParams {
  nlQuery: string;
  index: string | undefined;
  modelProvider: ModelProvider;
  events: ToolEventEmitter;
  logger: Logger;
  esClient: IScopedClusterClient;
  /**
   * Time range bound to `?_tstart`/`?_tend` when the query is executed for
   * validation. The live range is applied by Kibana at render time, so this
   * only affects the validation run. Defaults to the last 24 hours.
   */
  timeRange?: TimeRange;
}

/**
 * Resolve a visualization-ready ES|QL query, shared by the Lens and Vega
 * engines so both generate queries the same way.
 *
 * `generateEsql` validates and executes candidate queries in a bounded retry
 * loop, so a returned `query` is one that actually runs. A query is treated as
 * failed when none was produced or the loop still reported an execution error,
 * ensuring an unrunnable query never reaches config/spec authoring.
 */
export const generateVisualizationEsql = async ({
  nlQuery,
  index,
  modelProvider,
  events,
  logger,
  esClient,
  timeRange,
}: GenerateVisualizationEsqlParams): Promise<GeneratedVisualizationEsql> => {
  const response = await generateEsql({
    nlQuery,
    index,
    modelProvider,
    events,
    logger,
    esClient: esClient.asCurrentUser,
    additionalInstructions: esqlAdditionalInstructions,
    ...(timeRange ? { timeRange } : {}),
  });

  if (!response.query || response.error) {
    return { error: response.error ?? 'No queries generated' };
  }

  return { query: response.query, columns: response.results?.columns };
};
