/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { createVegaGraph } from './graph_vega';

export interface BuildVegaConfigParams {
  /** Natural-language description of the custom visualization to author. */
  nlQuery: string;
  /** Index, alias, or datastream to target; discovered when omitted. */
  index?: string;
  /** ES|QL query backing the visualization; generated when omitted. */
  esql?: string;
  /** Existing Vega spec (string) to modify, for edits. */
  existingSpec?: string;
  modelProvider: ModelProvider;
  logger: Logger;
  events: ToolEventEmitter;
  esClient: IScopedClusterClient;
}

export interface BuildVegaConfigResult {
  /** The Vega-Lite spec, serialized as the string the Vega embeddable expects. */
  spec: string;
  /** The ES|QL query backing the spec. */
  esqlQuery: string;
}

/**
 * Author a Kibana Vega-Lite specification from a natural-language request, for
 * visualizations Lens cannot express (small multiples / faceting, repeated
 * layers, bespoke encodings, …).
 *
 * Mirrors `buildVisualizationConfig` (the Lens path) but produces a Vega spec
 * string: it resolves an ES|QL query (and its result columns), asks the model to
 * author a spec bound to those columns, validates it, and injects the canonical
 * Kibana ES|QL `data.url` so data binding is always correct.
 */
export const buildVegaConfig = async ({
  nlQuery,
  index,
  esql,
  existingSpec,
  modelProvider,
  logger,
  events,
  esClient,
}: BuildVegaConfigParams): Promise<BuildVegaConfigResult> => {
  const graph = createVegaGraph(await modelProvider.getDefaultModel(), logger, events, esClient);

  const finalState = await graph.invoke({
    nlQuery,
    index,
    esql,
    existingSpec,
    esqlQuery: esql ?? '',
    currentAttempt: 0,
    actions: [],
    validatedSpec: null,
    error: null,
  });

  const { validatedSpec, error, esqlQuery } = finalState;

  if (!validatedSpec) {
    throw new Error(
      `Failed to generate a valid Vega spec. Last error: ${error || 'Unknown error'}`
    );
  }

  return { spec: validatedSpec, esqlQuery };
};
