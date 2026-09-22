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

/** Graph action emitted by the shared resolve-ES|QL node, part of both the Lens and Vega action unions. */
export interface ResolveEsqlAction {
  type: 'generate_esql';
  success: boolean;
  query?: string;
  /** Result columns of the executed query, used to inform config/spec authoring and validation. */
  columns?: EsqlEsqlColumnInfo[];
  error?: string;
}

export interface RunResolveEsqlNodeParams {
  /** Caller-provided or stored query, used as-is. Empty falls through to generation. */
  esqlQuery: string;
  nlQuery: string;
  index: string | undefined;
  existingQueries?: readonly string[];
  extraInstructions?: string;
  modelProvider: ModelProvider;
  events: ToolEventEmitter;
  logger: Logger;
  esClient: IScopedClusterClient;
}

export interface RunResolveEsqlNodeResult {
  esqlQuery: string;
  columns?: EsqlEsqlColumnInfo[];
  actions: ResolveEsqlAction[];
}

/**
 * Best-effort column probe for a query that is used as-is. Runs the same
 * request shape as generateEsql `execute: 'schema'` (LIMIT 1, keep all-null
 * columns), binding `?_tstart`/`?_tend` to {@link DEFAULT_ESQL_TIME_RANGE}.
 * A failed probe only costs column information: authoring then infers fields
 * from the query text, and the query itself is never discarded or regenerated.
 */
const probeEsqlColumns = async (
  query: string,
  esClient: IScopedClusterClient,
  logger: Logger
): Promise<EsqlEsqlColumnInfo[] | undefined> => {
  try {
    const { columns } = await executeEsql({
      query,
      params: buildTimeRangeParams(DEFAULT_ESQL_TIME_RANGE),
      limit: 1,
      dropNullColumns: false,
      esClient: esClient.asCurrentUser,
    });
    return columns;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(
      `Could not probe ES|QL query for columns (${errorMessage}); authoring will infer fields from the query text`
    );
    return undefined;
  }
};

/**
 * Shared Lens/Vega graph node: keep a provided or stored query and probe it for
 * columns, otherwise generate one (whose schema run already yields columns).
 * Either outcome is mapped onto a generate_esql action.
 */
export const runResolveEsqlNode = async ({
  esqlQuery,
  nlQuery,
  index,
  existingQueries,
  extraInstructions,
  modelProvider,
  events,
  logger,
  esClient,
}: RunResolveEsqlNodeParams): Promise<RunResolveEsqlNodeResult> => {
  if (esqlQuery) {
    const columns = await probeEsqlColumns(esqlQuery, esClient, logger);
    return {
      esqlQuery,
      columns,
      actions: [{ type: 'generate_esql', success: true, query: esqlQuery, columns }],
    };
  }

  let action: ResolveEsqlAction;
  try {
    logger.debug('Generating ES|QL query for visualization');
    const generated = await generateVisualizationEsql({
      nlQuery,
      existingQueries,
      extraInstructions,
      index,
      modelProvider,
      events,
      logger,
      esClient,
    });

    if (generated.query) {
      logger.debug(`Generated ES|QL query: ${generated.query}`);
      action = {
        type: 'generate_esql',
        success: true,
        query: generated.query,
        columns: generated.columns,
      };
    } else {
      action = {
        type: 'generate_esql',
        success: false,
        error: generated.error ?? 'No queries generated',
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to resolve ES|QL query: ${errorMessage}`);
    action = { type: 'generate_esql', success: false, error: errorMessage };
  }

  return {
    esqlQuery: action.query ?? esqlQuery,
    columns: action.columns,
    actions: [action],
  };
};
