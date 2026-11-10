/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { getLatestEntityIndexPattern } from '../../../../common';
import { runEntityGraphTraversalHopStepCommonDefinition } from '../../../../common/workflow/steps/entity_graph_traversal/run_entity_graph_traversal_hop_step_common';
import { resolveLatestEntityIndex } from '../../../domain/graph_traversal/resolve_latest_entity_index';
import { resolveSpaceId } from './resolve_space_id';
import { runHop, type EsqlResult, type ExecuteHopQuery } from './run_hop';

export const runEntityGraphTraversalHopStepDefinition = createServerStepDefinition({
  ...runEntityGraphTraversalHopStepCommonDefinition,
  handler: async (context) => {
    const {
      hop,
      hops_executed: hopsExecuted = 0,
      seed_id: seedId,
      space_id: givenSpaceId,
      lookup_index: givenLookupIndex,
      truncated_so_far,
      direction,
      limits,
      lookback,
      exclusions,
      until,
    } = context.input;
    // Everything carried from the previous hop is empty on the first one, which starts from
    // the seed.
    const edgesSoFar = context.input.edges ?? [];
    const nodesSoFar = context.input.nodes ?? [];
    // The frontier is the seed on the first hop, then the nodes the previous hop admitted,
    // and the visited set is the seed plus every node admitted so far; the loop need not
    // carry either, and an explicit list wins when one is given.
    const frontier =
      context.input.frontier ??
      (hopsExecuted === 0
        ? [seedId]
        : nodesSoFar.filter((node) => node.hop === hopsExecuted).map((node) => node.id));
    const visited = context.input.visited ?? [seedId, ...nodesSoFar.map((node) => node.id)];
    const untilMatchesSoFar = context.input.until_matches ?? [];
    const esClient = context.contextManager.getScopedEsClient();
    const { logger, abortSignal } = context;
    const setupStartedAt = performance.now();
    // The graph is the entity store of the execution space: nodes are its entities and edges
    // their relationship ids, so every hop reads the space's latest entity index.
    // The load step resolves the space once per run; a hop only repeats the lookup when it
    // is not given the space, or the given one is not the execution space.
    const contextSpaceId = context.contextManager.getContext().workflow.spaceId;
    const spaceId: string =
      givenSpaceId !== undefined && givenSpaceId === contextSpaceId
        ? givenSpaceId
        : await resolveSpaceId(context.contextManager);
    const index = getLatestEntityIndexPattern(spaceId);

    // Reached ids are joined to the concrete lookup-mode index so the payload fields describe
    // the reached node.
    let lookupIndex = givenLookupIndex;
    try {
      if (lookupIndex === undefined) {
        lookupIndex = await resolveLatestEntityIndex(esClient, spaceId);
      }
    } catch (error) {
      logger.debug(
        `entity graph traversal hop ${
          hop.hop_number
        }: no latest entity index to join in space "${spaceId}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    const execute: ExecuteHopQuery = async ({ query, params }) => {
      logger.info(
        `entity graph traversal hop ${hop.hop_number} (${hop.name}): ${params.length} frontier ids, query:\n${query}`
      );
      const response = await esClient.esql.query(
        { query, params, drop_null_columns: false },
        { signal: abortSignal }
      );
      const typed = response as unknown as Partial<EsqlResult>;
      if (!Array.isArray(typed.columns) || !Array.isArray(typed.values)) {
        throw new Error(
          `Hop "${hop.name}" ES|QL response did not contain columns and values arrays`
        );
      }
      return {
        columns: typed.columns,
        values: typed.values,
        ...(typeof typed.took === 'number' && { took: typed.took }),
      };
    };
    // Everything before the first query: the space lookup and the lookup-index resolution.
    const setupMs = Math.round((performance.now() - setupStartedAt) * 10) / 10;

    try {
      const output = await runHop(
        {
          hop,
          index,
          lookupIndex,
          direction,
          frontier,
          visited,
          edgesSoFar: edgesSoFar.length,
          truncatedSoFar: truncated_so_far,
          limits,
          lookback,
          exclusions,
          until,
        },
        execute
      );
      logger.info(
        `entity graph traversal hop ${hop.hop_number} (${hop.name}): ${output.stats.edges_added} edges, ${output.stats.new_nodes} new nodes, stop_reason="${output.stop_reason}"`
      );
      // Edge payloads were only needed to evaluate stop conditions inside the hop, so they
      // are not returned, which keeps the loop state the workflow retains small.
      const edges = output.edges.map(({ payload, ...edge }) => edge);
      return {
        output: {
          ...output,
          edges: [...edgesSoFar, ...edges],
          nodes: [...nodesSoFar, ...output.nodes],
          until_matches: [...untilMatchesSoFar, ...output.until_matches],
          stats: { ...output.stats, setup_ms: setupMs },
        },
      };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  },
});
