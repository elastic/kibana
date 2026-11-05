/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import {
  traversalEdgeSchema,
  traversalExclusionsSchema,
  traversalStopConditionsSchema,
  traversalHopSchema,
  traversalIdListSchema,
  traversalDirectionSchema,
  traversalLimitsSchema,
  traversalLookbackSchema,
  traversalNodeSchema,
  traversalStopReasonSchema,
} from './entity_graph_traversal_common';

/**
 * A value carried from the previous hop's output. On the first hop there is no previous
 * output, and the engine renders the reference as empty, so empty means "not yet".
 */
const carried = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' || value === null ? undefined : value), schema.optional());

export const runEntityGraphTraversalHopInputSchema = lazySchema(() =>
  z.object({
    hop: traversalHopSchema.describe(
      'The hop to run: the expanded hop of the loaded scenario at index hops_executed'
    ),
    hops_executed: carried(z.coerce.number().int().min(0)).describe(
      "Hops already run, which is the previous hop output's hop_number; unset on the first hop"
    ),
    seed_id: z
      .string()
      .min(1)
      .max(2048)
      .describe('The entity the traversal starts from; the first hop expands it'),
    space_id: carried(z.string().min(1).max(256)).describe(
      'The execution space as the load step resolved it; when it matches the workflow context the hop skips the space lookup'
    ),
    lookup_index: carried(z.string().min(1).max(512)).describe(
      'The concrete latest entity index to join, as the load step resolved it; resolved again when omitted'
    ),
    frontier: carried(traversalIdListSchema).describe(
      'Ids to expand on this hop; derived when omitted: the seed on the first hop, then the nodes the previous hop admitted'
    ),
    visited: carried(traversalIdListSchema).describe(
      'Ids already admitted, including the seed; derived from seed_id and nodes when omitted'
    ),
    edges: carried(z.array(traversalEdgeSchema)).describe(
      "Edges accumulated by earlier hops: the previous hop output's edges"
    ),
    nodes: carried(z.array(traversalNodeSchema)).describe(
      "Nodes admitted by earlier hops: the previous hop output's nodes"
    ),
    until_matches: carried(traversalIdListSchema).describe(
      "Stop-condition matches of earlier hops: the previous hop output's until_matches"
    ),
    truncated_so_far: z.coerce
      .boolean()
      .default(false)
      .describe('Whether an earlier hop already dropped data'),
    direction: traversalDirectionSchema().describe(
      "out follows the frontier entities' relationship ids; both also reaches the entities whose relationship ids point at the frontier"
    ),
    limits: traversalLimitsSchema.describe('Effective limits from the load step'),
    lookback: traversalLookbackSchema().describe(
      'Only expand entities seen within this window (entity.lifecycle.last_seen), for example 7d'
    ),
    exclusions: traversalExclusionsSchema().describe(
      'Field/values pairs to leave out: documents carrying one of the values are not read, and values on entity.id are removed from the frontier and from the targets'
    ),
    until: traversalStopConditionsSchema().describe(
      'Stop conditions: the hop ends the traversal (stop_reason until_matched) when it admits a node whose id, or whose reaching edge payload, carries one of the values; a field a condition names is read as payload even when the hop does not list it'
    ),
  })
);

export const runEntityGraphTraversalHopOutputSchema = lazySchema(() =>
  z.object({
    hop_number: z.number().int().min(1),
    hop_name: z.string(),
    /** Every edge so far: the carried edges followed by this hop's. */
    edges: z.array(traversalEdgeSchema),
    /**
     * Every node admitted so far, as id, hop, via and type only. The loop carries this list
     * from hop to hop, so it stays small; the workflow resolves the nodes once at the end.
     */
    nodes: z.array(traversalNodeSchema),
    next_frontier: z.array(z.string()),
    /** Ids of admitted nodes that matched a stop condition, over every hop so far. */
    until_matches: z.array(z.string()),
    visited: z.array(z.string()),
    truncated: z.boolean(),
    stop_reason: traversalStopReasonSchema,
    stats: z.object({
      frontier_size: z.number().int(),
      frontier_expanded: z.number().int(),
      dropped_frontier: z.number().int(),
      queries: z.number().int(),
      queries_skipped: z.number().int(),
      rows_returned: z.number().int(),
      edges_added: z.number().int(),
      dropped_edges: z.number().int(),
      excluded_frontier: z.number().int(),
      excluded_edges: z.number().int(),
      until_matched: z.number().int(),
      closing_edges: z.number().int(),
      new_nodes: z.number().int(),
      hubs_skipped: z.array(z.string()),
      /** Milliseconds resolving the space and the lookup index before the first query. */
      setup_ms: z.number(),
      /** Milliseconds the hop's queries took round trip, summed. */
      query_ms: z.number(),
      /** Milliseconds Elasticsearch reports it spent on the hop's queries (`took`), summed. */
      es_took_ms: z.number(),
    }),
  })
);

export const runEntityGraphTraversalHopStepCommonDefinition: BaseStepDefinition<
  typeof runEntityGraphTraversalHopInputSchema,
  typeof runEntityGraphTraversalHopOutputSchema
> = {
  id: 'entityStore.runEntityGraphTraversalHop',
  label: i18n.translate('entityStore.workflow.steps.runEntityGraphTraversalHop.label', {
    defaultMessage: 'Run Entity Graph Traversal Hop',
  }),
  description: i18n.translate('entityStore.workflow.steps.runEntityGraphTraversalHop.description', {
    defaultMessage:
      'Expand one hop of an entity graph traversal: query the entity store for the frontier ids, bound as ES|QL parameters, and return every edge and node so far plus the next frontier, within the run limits. The loop carries the output forward through variables.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: runEntityGraphTraversalHopInputSchema,
  outputSchema: runEntityGraphTraversalHopOutputSchema,
  documentation: {
    details: i18n.translate(
      'entityStore.workflow.steps.runEntityGraphTraversalHop.documentation.details',
      {
        defaultMessage:
          'The step expands the given hop from the frontier: the seed on the first hop, then the nodes the previous hop admitted, unless a frontier is given. For each target field it runs one ES|QL query of the form FROM index | WHERE entity.id IN (frontier) | MV_EXPAND target | LOOKUP JOIN latest index | STATS COUNT(*), VALUES(payload) BY source, target | LIMIT n, where n is the smaller of max_edges_per_hop and the edge budget still unfilled, so the payload describes the reached node and no row that could not be admitted is read. ' +
          'The frontier is passed as query parameters, never interpolated. Frontier ids beyond max_frontier are dropped, a source with more distinct targets than hub_degree is not expanded, and edges or nodes beyond max_edges_total or max_nodes are dropped; every drop sets truncated. ' +
          'stop_reason is non-empty when the traversal cannot continue: the frontier is exhausted or a total cap was reached. Targets already in visited produce closing edges but are not added to the next frontier. ' +
          'Nodes are returned as id, hop, via and type only; resolve them once after the loop with entityStore.resolveEntityGraphTraversalNodes. ' +
          'stats report where the hop spent its time: setup_ms before the first query, query_ms round trip over its queries, and es_took_ms as the time Elasticsearch reports for them, so query_ms minus es_took_ms is transport and client cost.',
      }
    ),
    examples: [
      `## Expand the current frontier inside a while loop
\`\`\`yaml
- name: run_hop
  type: entityStore.runEntityGraphTraversalHop
  with:
    hop: "\${{ steps.load_scenario.output.hops[variables.hops_executed] }}"
    hops_executed: "\${{ variables.hops_executed }}"
    seed_id: "{{ inputs.seed_id }}"
    space_id: "\${{ steps.load_scenario.output.space_id }}"
    lookup_index: "\${{ steps.load_scenario.output.lookup_index }}"
    edges: "\${{ variables.edges }}"
    nodes: "\${{ variables.nodes }}"
    until_matches: "\${{ variables.until_matches }}"
    truncated_so_far: "\${{ variables.truncated }}"
    limits: "\${{ steps.load_scenario.output.limits }}"
    lookback: "{{ inputs.lookback }}"
    exclusions: "\${{ inputs.exclusions }}"
    until: "\${{ steps.load_scenario.output.until }}"
\`\`\``,
    ],
  },
};
