/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import {
  resolveEsqlForAuthoring,
  type ResolveEsqlForAuthoringParams,
} from './resolve_esql_for_authoring';

/** Graph action emitted by the shared resolve-ES|QL node; Lens and Vega alias it as GenerateEsqlAction. */
export interface ResolveEsqlAction {
  type: 'generate_esql';
  success: boolean;
  query?: string;
  /** Result columns of the executed query, used to inform config/spec authoring and validation. */
  columns?: EsqlEsqlColumnInfo[];
  error?: string;
}

export interface RunResolveEsqlNodeParams
  extends Omit<ResolveEsqlForAuthoringParams, 'providedQuery'> {
  /** Appearance-only restyle: keep `esqlQuery` and skip the schema probe. */
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
 * Shared Lens/Vega graph node: skip the probe on appearance-only edits,
 * otherwise resolve a query and map the outcome onto a generate_esql action.
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
    return {
      esqlQuery,
      actions: [{ type: 'generate_esql', success: true, query: esqlQuery }],
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
        ? { type: 'generate_esql', success: false, error: resolved.error }
        : {
            type: 'generate_esql',
            success: true,
            query: resolved.query,
            columns: resolved.columns,
          };
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
