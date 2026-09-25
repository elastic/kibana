/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
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

const getEsErrorBody = (error: unknown): { type?: string; reason?: string } | undefined =>
  error instanceof errors.ResponseError
    ? (error.body as { error?: { type?: string; reason?: string } } | undefined)?.error
    : undefined;

/**
 * True when Elasticsearch rejected the query itself. ES|QL reports unknown
 * indices and columns as `verification_exception`, so it covers those too.
 * Anything else (timeouts, circuit breakers, response-size limits, access)
 * says nothing about whether the query is well-formed.
 */
const isQueryRejected = (error: unknown): boolean => {
  const { type } = getEsErrorBody(error) ?? {};
  return type === 'verification_exception' || type === 'parsing_exception';
};

const describeEsError = (error: unknown): string =>
  getEsErrorBody(error)?.reason ?? (error instanceof Error ? error.message : String(error));

/**
 * Collect result columns for a query that must be kept as-is. A failed probe
 * only costs column information (authoring infers fields from the query text);
 * it never discards or regenerates the query.
 */
export const probeEsqlColumns = async (
  query: string,
  esClient: IScopedClusterClient,
  logger: Logger
): Promise<EsqlEsqlColumnInfo[] | undefined> => {
  try {
    const { columns } = await executeForSchema(query, esClient);
    return columns;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(
      `ES|QL query executed without returning columns (${errorMessage}); authoring will infer fields from the query text`
    );
    return undefined;
  }
};

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
  // validation never catches. Execute it; if Elasticsearch rejects the query,
  // discard it and fall through to self-correcting generation rather than
  // author around a query that can never render, seeding generation with the
  // failed query and error so the model can correct it. Any other failure is
  // about the cluster, not the query, so keep the query and only lose columns.
  if (query) {
    logger.debug('Validating provided ES|QL query for visualization');
    try {
      ({ columns } = await executeForSchema(query, esClient));
    } catch (error) {
      const errorMessage = describeEsError(error);
      if (isQueryRejected(error)) {
        logger.warn(
          `Provided ES|QL query failed to execute (${errorMessage}); regenerating a corrected query`
        );
        failedProvidedQueryContext = `A provided ES|QL query failed to execute: "${query}" (error: ${errorMessage}). Avoid repeating this mistake.`;
        query = '';
      } else {
        logger.warn(
          `Provided ES|QL query could not be probed for columns (${errorMessage}); keeping it and inferring fields from the query text`
        );
      }
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
    // Generation validated with a schema probe, so its columns are authoritative.
    columns = generated.columns;
  }

  return { query, columns };
};
