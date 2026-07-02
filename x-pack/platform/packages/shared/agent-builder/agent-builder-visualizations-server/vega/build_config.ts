/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { validateEsqlQuery } from '@kbn/agent-builder-genai-utils';
import { buildServerESQLCallbacks } from '@kbn/esql-server-utils';
import { createVegaGraph } from './graph';
import { extractEsqlFromSpec } from './recover_esql';

export interface BuildVegaConfigParams {
  nlQuery: string;
  index?: string;
  esql?: string;
  /** Existing serialized Vega spec to edit, if any. */
  existingSpec?: string;
  /** Optional chart-type hint for the intended visual form (Vega authors free-form). */
  chartType?: SupportedChartType;
  modelProvider: ModelProvider;
  logger: Logger;
  events: ToolEventEmitter;
  esClient: IScopedClusterClient;
}

export interface BuildVegaConfigResult {
  /** Serialized, render-ready Vega-Lite specification. */
  spec: string;
  /** Canonical ES|QL query bound into the spec's data source. */
  esqlQuery: string;
}

/**
 * Orchestrate Vega-Lite spec generation: optionally reuse a caller-provided
 * ES|QL query (dropped if it fails validation so the graph regenerates one), on
 * edits seed generation with the query recovered from the existing spec so the
 * graph can modify it when the instruction needs different data, run the
 * generation graph, and surface a clear error if no spec is produced.
 */
export const buildVegaConfig = async ({
  nlQuery,
  index,
  esql,
  existingSpec,
  chartType,
  modelProvider,
  logger,
  events,
  esClient,
}: BuildVegaConfigParams): Promise<BuildVegaConfigResult> => {
  // If the caller provides ES|QL, keep it only when validation says it is safe.
  // If validation cannot run, keep it and let the graph handle it.
  let providedEsql = esql;
  if (providedEsql) {
    let validationError: string | undefined;
    try {
      validationError = await validateEsqlQuery(
        providedEsql,
        buildServerESQLCallbacks({ client: esClient.asCurrentUser })
      );
    } catch {
      // Couldn't validate, keep it.
    }
    if (validationError) {
      logger.warn(
        `Provided ES|QL failed validation; regenerating from the natural-language query. Error: ${validationError}`
      );
      providedEsql = undefined;
    }
  }

  // On edit, recover the ES|QL embedded in the existing spec and pass it to the
  // graph as context (not as the query to reuse). The graph modifies it when the
  // instruction needs different data (e.g. a new breakdown) and keeps it for
  // visual-only edits, so query-changing edits are not blocked. A trusted
  // caller-provided query (above) still takes precedence. Recovery also survives
  // save/import round-trips, where the stored spec is the source of truth.
  const existingEsql = existingSpec ? extractEsqlFromSpec(existingSpec) : undefined;
  if (existingEsql) {
    logger.debug('Recovered ES|QL from the existing Vega spec to seed this edit');
  }

  const graph = await createVegaGraph(modelProvider, logger, events, esClient);

  const finalState = await graph.invoke({
    nlQuery,
    index,
    existingSpec,
    existingEsql,
    chartType,
    esqlQuery: providedEsql || '',
    currentAttempt: 0,
    actions: [],
    spec: null,
    error: null,
  });

  const { spec, error, esqlQuery } = finalState;

  if (!spec) {
    throw new Error(
      `Failed to generate a valid Vega specification. Last error: ${error || 'Unknown error'}`
    );
  }

  return { spec, esqlQuery };
};
