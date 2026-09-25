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
import { createVegaGraph } from './graph';
import { extractEsqlFromSpec } from './recover_esql';

interface BuildVegaConfigParams {
  nlQuery: string;
  index?: string;
  esql?: string;
  /** Existing serialized Vega spec to edit, if any. */
  existingSpec?: string;
  /**
   * Keep the ES|QL query recovered from `existingSpec` instead of regenerating
   * one. The edit then only re-authors the spec around it. Ignored when `esql`
   * is provided, since a provided query always takes precedence.
   */
  preserveESQL?: boolean;
  /** Optional chart-type hint for the intended visual form (Vega authors free-form). */
  chartType?: SupportedChartType;
  modelProvider: ModelProvider;
  logger: Logger;
  events: ToolEventEmitter;
  esClient: IScopedClusterClient;
}

interface BuildVegaConfigResult {
  /** Serialized, render-ready Vega-Lite specification. */
  spec: string;
  /** Visualization / panel title from the authoring response schema. */
  title?: string;
  /** One-sentence factual description of the chart and notable presentation choices. */
  authoringNote?: string;
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
  preserveESQL = false,
  chartType,
  modelProvider,
  logger,
  events,
  esClient,
}: BuildVegaConfigParams): Promise<BuildVegaConfigResult> => {
  // A caller-provided ES|QL query is handed to the graph as-is: its resolve
  // node executes the query (which subsumes syntax validation) and regenerates
  // a corrected one when execution fails. It therefore supersedes preserving
  // the existing query, which is only ever kept verbatim when it is the one
  // recovered from the spec being edited.
  if (preserveESQL && esql) {
    logger.warn(
      'Both an ES|QL query and preserveESQL were given; the provided query takes precedence and the existing one is not preserved.'
    );
  }
  const keepsExistingEsql = preserveESQL && !esql;

  // On edit, recover the ES|QL embedded in the existing spec and pass it to the
  // graph as context (not as the query to reuse). The graph modifies it when the
  // instruction needs different data (e.g. a new breakdown) and keeps it for
  // visual-only edits, so query-changing edits are not blocked. A
  // caller-provided query still takes precedence. Recovery also survives
  // save/import round-trips, where the stored spec is the source of truth.
  const existingEsql = existingSpec ? extractEsqlFromSpec(existingSpec) : undefined;
  if (existingEsql) {
    logger.debug('Recovered ES|QL from the existing Vega spec to seed this edit');
  }
  if (keepsExistingEsql && !existingEsql) {
    throw new Error(
      'Preserving the ES|QL query requires an existing Vega spec with a recoverable ES|QL query.'
    );
  }

  const graph = await createVegaGraph(modelProvider, logger, events, esClient);

  const finalState = await graph.invoke({
    nlQuery,
    index,
    existingSpec,
    existingEsql,
    chartType,
    preserveESQL: keepsExistingEsql,
    // Preserving ES|QL reuses the recovered query as the trusted query: the
    // graph only probes it for columns and re-authors the spec around it.
    esqlQuery: esql || (keepsExistingEsql ? existingEsql : '') || '',
    currentAttempt: 0,
    actions: [],
    spec: null,
    title: null,
    error: null,
  });

  const { spec, title, authoringNote, error, esqlQuery } = finalState;

  if (!spec) {
    throw new Error(
      `Failed to generate a valid Vega specification. Last error: ${error || 'Unknown error'}`
    );
  }

  return {
    spec,
    ...(typeof title === 'string' && title.trim() ? { title: title.trim() } : {}),
    ...(authoringNote ? { authoringNote } : {}),
    esqlQuery,
  };
};
