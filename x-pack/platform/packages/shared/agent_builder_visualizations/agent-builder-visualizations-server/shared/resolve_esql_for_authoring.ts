/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { buildTimeRangeParams, executeEsql } from '@kbn/agent-builder-genai-utils';
import { generateVisualizationEsql } from './generate_visualization_esql';

/** A query that executed, plus its result columns when they were collected. */
interface ResolvedEsqlQuery {
  query: string;
  columns?: EsqlEsqlColumnInfo[];
}

/** No usable query could be resolved for config/spec authoring. */
interface ResolvedEsqlError {
  error: string;
}

type ResolvedEsqlForAuthoring = ResolvedEsqlQuery | ResolvedEsqlError;

interface ResolveEsqlForAuthoringParams {
  /** Caller-provided query to try first. Empty/undefined falls through to generation. */
  providedQuery: string | undefined;
  nlQuery: string;
  index: string | undefined;
  existingQueries?: readonly string[];
  extraInstructions?: string;
  modelProvider: ModelProvider;
  events: ToolEventEmitter;
  logger: Logger;
  esClient: IScopedClusterClient;
}

/**
 * Default range used only to bind `?_tstart`/`?_tend` when executing a query
 * server-side to collect its result columns. The live dashboard range is applied
 * by Kibana at render time.
 */
const DEFAULT_VALIDATION_TIME_RANGE = { from: 'now-24h', to: 'now' } as const;

/** Same request shape as generateEsql `execute: 'schema'`. */
const executeSchemaParams = {
  dropNullColumns: false,
  limit: 1,
} as const;

/**
 * Resolve an ES|QL query and its result columns for visualization authoring.
 *
 * A provided query is executed first; if it fails (or none was given),
 * `generateVisualizationEsql` produces a replacement. Time-picker params
 * (`?_tstart`/`?_tend`) are bound with a default range inside execute/generate
 * so the query can run server-side; Kibana binds the live range at render time.
 */
export const resolveEsqlForAuthoring = async ({
  providedQuery,
  nlQuery,
  index,
  existingQueries,
  extraInstructions,
  modelProvider,
  events,
  logger,
  esClient,
}: ResolveEsqlForAuthoringParams): Promise<ResolvedEsqlForAuthoring> => {
  let query = providedQuery ?? '';
  let columns: EsqlEsqlColumnInfo[] | undefined;

  // A provided query is only trustworthy if it actually runs: the caller may
  // pass an LLM-invented query whose error (e.g. a type mismatch) AST
  // validation never catches. Execute it; if it throws, discard it and fall
  // through to self-correcting generation rather than author around a query
  // that can never render.
  if (query) {
    logger.debug('Validating provided ES|QL query for visualization');
    try {
      ({ columns } = await executeEsql({
        query,
        params: buildTimeRangeParams(DEFAULT_VALIDATION_TIME_RANGE),
        ...executeSchemaParams,
        esClient: esClient.asCurrentUser,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(
        `Provided ES|QL query failed to execute (${errorMessage}); regenerating a corrected query`
      );
      query = '';
    }
  }

  if (!query) {
    logger.debug('Generating ES|QL query for visualization');
    const generated = await generateVisualizationEsql({
      nlQuery,
      existingQueries,
      index,
      modelProvider,
      events,
      logger,
      esClient,
      ...(extraInstructions ? { extraInstructions } : {}),
    });

    if (!generated.query) {
      return { error: generated.error ?? 'No queries generated' };
    }

    query = generated.query;
    logger.debug(`Generated ES|QL query: ${query}`);
    columns = generated.columns;
    if (!columns) {
      ({ columns } = await executeEsql({
        query,
        params: buildTimeRangeParams(DEFAULT_VALIDATION_TIME_RANGE),
        ...executeSchemaParams,
        esClient: esClient.asCurrentUser,
      }));
    }
  }

  return { query, columns };
};
