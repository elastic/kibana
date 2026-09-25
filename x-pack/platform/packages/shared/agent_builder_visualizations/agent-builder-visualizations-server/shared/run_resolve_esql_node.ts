/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import {
  probeEsqlColumns,
  resolveEsqlForAuthoring,
  type ResolveEsqlForAuthoringParams,
} from './resolve_esql_for_authoring';

/** Graph action emitted by the shared resolve-ES|QL node, part of both the Lens and Vega action unions. */
export interface ResolveEsqlAction {
  type: 'resolve_esql';
  success: boolean;
  query?: string;
  /** Result columns of the executed query, used to inform config/spec authoring and validation. */
  columns?: EsqlEsqlColumnInfo[];
  error?: string;
}

export interface RunResolveEsqlNodeParams
  extends Omit<ResolveEsqlForAuthoringParams, 'providedQuery'> {
  /**
   * Appearance-only restyle: keep `esqlQuery` verbatim and never regenerate
   * it. The query is still probed for result columns, tolerating failure.
   */
  preserveESQL?: boolean;
  /** Caller-provided or stored query. Empty falls through to generation. */
  esqlQuery: string;
}

export interface RunResolveEsqlNodeResult {
  esqlQuery: string;
  columns?: EsqlEsqlColumnInfo[];
  actions: ResolveEsqlAction[];
}

/**
 * Shared Lens/Vega graph node: on appearance-only edits keep the stored query
 * and only probe it for columns, otherwise resolve a query; either outcome is
 * mapped onto a resolve_esql action.
 */
export const runResolveEsqlNode = async ({
  preserveESQL = false,
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
  if (preserveESQL) {
    // Vega re-authors the whole spec, so it still needs the executed column
    // names/types; a failed probe must not fail or regenerate the stored query.
    const columns = await probeEsqlColumns(esqlQuery, esClient, logger);
    return {
      esqlQuery,
      columns,
      actions: [{ type: 'resolve_esql', success: true, query: esqlQuery, columns }],
    };
  }

  let action: ResolveEsqlAction;
  try {
    const resolved = await resolveEsqlForAuthoring({
      providedQuery: esqlQuery,
      nlQuery,
      index,
      existingQueries,
      extraInstructions,
      modelProvider,
      events,
      logger,
      esClient,
    });

    action =
      'error' in resolved
        ? { type: 'resolve_esql', success: false, error: resolved.error }
        : {
            type: 'resolve_esql',
            success: true,
            query: resolved.query,
            columns: resolved.columns,
          };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to resolve ES|QL query: ${errorMessage}`);
    action = { type: 'resolve_esql', success: false, error: errorMessage };
  }

  return {
    esqlQuery: action.query ?? esqlQuery,
    columns: action.columns,
    actions: [action],
  };
};
