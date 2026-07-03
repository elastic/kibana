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
  /**
   * ES|QL queries from the artifact being edited (a single Vega query, or one
   * per Lens layer). Folded into the request as context so the model modifies
   * them when the edit needs different data and keeps them otherwise.
   */
  existingQueries?: readonly string[];
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
  /**
   * Renderer-specific guidance appended to the shared ES|QL instructions, e.g.
   * Vega's stricter time-range-filtering requirements.
   */
  extraInstructions?: string;
}

/**
 * Fold the ES|QL queries from an artifact being edited into the natural-language
 * request as context, so the generator modifies them when the edit needs
 * different data and keeps them otherwise. Returns the request unchanged when
 * there are no existing queries. Shared by the Lens and Vega engines so edits
 * are seeded the same way.
 */
export const buildEsqlEditContext = (
  nlQuery: string,
  existingQueries: readonly string[] = []
): string => {
  if (existingQueries.length === 0) {
    return nlQuery;
  }
  if (existingQueries.length === 1) {
    return `Existing esql query to modify: "${existingQueries[0]}"\n\nUser query: ${nlQuery}`;
  }
  const queriesContext = existingQueries.map((query, i) => `Layer ${i + 1}: "${query}"`).join('\n');
  return `Existing esql queries from multiple layers:\n${queriesContext}\n\nUser query: ${nlQuery}`;
};

/**
 * Resolve a visualization-ready ES|QL query, shared by the Lens and Vega
 * engines so both generate queries the same way.
 *
 * `generateEsql` validates and executes candidate queries in a bounded retry
 * loop, so a returned `query` is one that actually runs. A query is treated as
 * failed when none was produced or the loop still reported an execution error,
 * ensuring an unrunnable query never reaches config/spec authoring. On edits,
 * `existingQueries` seed the request so a query-changing edit is not blocked.
 */
export const generateVisualizationEsql = async ({
  nlQuery,
  index,
  existingQueries,
  modelProvider,
  events,
  logger,
  esClient,
  timeRange,
  extraInstructions,
}: GenerateVisualizationEsqlParams): Promise<GeneratedVisualizationEsql> => {
  const response = await generateEsql({
    nlQuery: buildEsqlEditContext(nlQuery, existingQueries),
    index,
    modelProvider,
    events,
    logger,
    esClient: esClient.asCurrentUser,
    additionalInstructions: extraInstructions
      ? `${esqlAdditionalInstructions}\n${extraInstructions}`
      : esqlAdditionalInstructions,
    ...(timeRange ? { timeRange } : {}),
  });

  if (!response.query || response.error) {
    return { error: response.error ?? 'No queries generated' };
  }

  return { query: response.query, columns: response.results?.columns };
};
