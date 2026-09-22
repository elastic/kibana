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
import {
  buildTimeRangeParams,
  DEFAULT_ESQL_TIME_RANGE,
  executeEsql,
} from '@kbn/agent-builder-genai-utils';
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

export interface ResolveEsqlForAuthoringParams {
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

/** Same request shape as generateEsql `execute: 'schema'`. */
const executeSchemaParams = {
  dropNullColumns: false,
  limit: 1,
} as const;

/**
 * Probe-execute a query to collect result columns. Binds `?_tstart`/`?_tend`
 * with {@link DEFAULT_ESQL_TIME_RANGE}, the window `generateEsql` uses when this
 * probe omits `timeRange`. The live dashboard range is applied at render time.
 */
const executeForSchema = (
  query: string,
  esClient: IScopedClusterClient
): ReturnType<typeof executeEsql> =>
  executeEsql({
    query,
    params: buildTimeRangeParams(DEFAULT_ESQL_TIME_RANGE),
    ...executeSchemaParams,
    esClient: esClient.asCurrentUser,
  });

/** Resolve a runnable ES|QL query and its schema-probe columns for visualization authoring. */
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
  let failedProvidedQueryContext: string | undefined;

  // A provided query is only trustworthy if it actually runs: the caller may
  // pass an LLM-invented query whose error (e.g. a type mismatch) AST
  // validation never catches. Execute it; if it throws, discard it and fall
  // through to self-correcting generation rather than author around a query
  // that can never render. Seed generation with the failed query and error so
  // the model can correct it instead of starting from scratch.
  if (query) {
    logger.debug('Validating provided ES|QL query for visualization');
    try {
      ({ columns } = await executeForSchema(query, esClient));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(
        `Provided ES|QL query failed to execute (${errorMessage}); regenerating a corrected query`
      );
      failedProvidedQueryContext = `A provided ES|QL query failed to execute: "${query}" (error: ${errorMessage}). Avoid repeating this mistake.`;
      query = '';
    }
  }

  if (!query) {
    logger.debug('Generating ES|QL query for visualization');
    const generated = await generateVisualizationEsql({
      nlQuery,
      existingQueries,
      extraInstructions,
      additionalContext: failedProvidedQueryContext,
      index,
      modelProvider,
      events,
      logger,
      esClient,
    });

    if (!generated.query) {
      return { error: generated.error ?? 'No queries generated' };
    }

    query = generated.query;
    logger.debug(`Generated ES|QL query: ${query}`);
    columns = generated.columns;
    if (columns === undefined) {
      try {
        ({ columns } = await executeForSchema(query, esClient));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(
          `Generated ES|QL query executed without returning columns (${errorMessage}); authoring will infer fields from the query text`
        );
      }
    }
  }

  return { query, columns };
};
