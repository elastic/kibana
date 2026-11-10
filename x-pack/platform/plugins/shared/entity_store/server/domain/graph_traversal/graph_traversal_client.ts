/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getLatestEntityIndexPattern } from '../../../common/domain/entity_index';
import type {
  GraphTraversalExclusion,
  GraphTraversalHopStats,
  GraphTraversalHopTimings,
  GraphTraversalOutput,
  GraphTraversalStopCondition,
  RunGraphTraversalResponse,
} from '../../../common/graph_traversal';
import { traceGraphTraversalRoutes } from '../../../common/graph_traversal';
import type {
  TraversalEdge,
  TraversalNode,
  TraversalStopReason,
} from '../../../common/graph_traversal/hop_types';
import {
  listEntityGraphTraversalScenarioIds,
  loadEntityGraphTraversalPlan,
  type EntityGraphTraversalExpandedHop,
} from '../../../common/graph_traversal/scenarios';
import { GraphTraversalError } from './graph_traversal_error';
import { resolveLatestEntityIndex } from './resolve_latest_entity_index';
import type { HopQueryParam } from './hops/build_hop_query';
import { resolveNodes, type ExecuteResolveQuery } from './hops/resolve_nodes';
import { runHop, type EsqlResult, type ExecuteHopQuery } from './hops/run_hop';

export const HOPS_GRAPH_TRAVERSAL_EXECUTION_ID = 'hops';

/** Milliseconds since `startedAt`, to a tenth. */
const elapsedMs = (startedAt: number): number =>
  Math.round((performance.now() - startedAt) * 10) / 10;

export interface GraphTraversalClientDeps {
  logger: Logger;
  namespace: string;
  esClient: ElasticsearchClient;
}

export interface RunGraphTraversalParams {
  scenarioId: string;
  seedId: string;
  lookback?: string;
  maxHops?: number;
  exclusions?: GraphTraversalExclusion[];
  /** Added to the scenario's own stop conditions. */
  until?: GraphTraversalStopCondition[];
}

/**
 * Runs a traversal scenario hop by hop, in process: one ES|QL query per relationship field
 * per hop over the entity store's latest index, the frontier bound as parameters, every hop
 * bounded by the scenario's limits, then one lookup to resolve the nodes. The whole run
 * happens inside the request, so a caller waits only for the queries themselves.
 */
export class GraphTraversalClient {
  private readonly logger: Logger;
  private readonly namespace: string;
  private readonly esClient: ElasticsearchClient;

  constructor({ logger, namespace, esClient }: GraphTraversalClientDeps) {
    this.logger = logger;
    this.namespace = namespace;
    this.esClient = esClient;
  }

  public async run({
    scenarioId,
    seedId,
    lookback,
    maxHops,
    exclusions = [],
    until = [],
  }: RunGraphTraversalParams): Promise<RunGraphTraversalResponse> {
    const startedAt = Date.now();
    const plan = loadEntityGraphTraversalPlan(
      scenarioId,
      maxHops !== undefined ? { max_hops: maxHops } : undefined
    );
    if (!plan) {
      throw new GraphTraversalError(
        `Unknown entity graph traversal scenario "${scenarioId}". Available: ${listEntityGraphTraversalScenarioIds().join(
          ', '
        )}`,
        400
      );
    }
    const stopConditions = [...plan.until, ...until];
    const indexPattern = getLatestEntityIndexPattern(this.namespace);

    // The concrete lookup-mode index is resolved once for every hop and the node lookup.
    const resolveStartedAt = performance.now();
    const lookupIndex = await this.resolveLookupIndex();
    const resolveIndexMs = elapsedMs(resolveStartedAt);

    // The seed is hop 0 of the result so consumers can draw it and the hop-1 edges from it.
    const seedNode: TraversalNode = { id: seedId, hop: 0, via: 'seed', type: plan.seed.type };
    const edges: TraversalEdge[] = [];
    const nodes: TraversalNode[] = [];
    const untilMatches: string[] = [];
    const hopStats: GraphTraversalHopStats[] = [];
    let truncated = false;
    let stopReason: TraversalStopReason = '';
    let hopsExecuted = 0;

    const hopsStartedAt = performance.now();
    for (const hop of plan.hops) {
      // The frontier is the seed on the first hop, then the nodes the previous hop admitted;
      // the visited set is the seed plus every node admitted so far.
      const frontier =
        hopsExecuted === 0
          ? [seedId]
          : nodes.filter((node) => node.hop === hopsExecuted).map((node) => node.id);
      const visited = [seedId, ...nodes.map((node) => node.id)];
      const hopStartedAt = performance.now();
      const result = await runHop(
        {
          hop,
          index: indexPattern,
          lookupIndex,
          direction: plan.direction,
          frontier,
          visited,
          edgesSoFar: edges.length,
          truncatedSoFar: truncated,
          limits: plan.limits,
          lookback,
          exclusions,
          until: stopConditions,
        },
        this.executeHop(hop)
      );
      // Edge payloads only serve the stop conditions inside the hop; they are not returned.
      for (const { payload, ...edge } of result.edges) edges.push(edge);
      nodes.push(...result.nodes);
      untilMatches.push(...result.until_matches);
      truncated = result.truncated;
      stopReason = result.stop_reason;
      hopsExecuted = hop.hop_number;
      hopStats.push({
        hop_number: hop.hop_number,
        name: hop.name,
        frontier_size: result.stats.frontier_size,
        queries: result.stats.queries,
        rows_returned: result.stats.rows_returned,
        edges_added: result.stats.edges_added,
        new_nodes: result.stats.new_nodes,
        hop_ms: elapsedMs(hopStartedAt),
        query_ms: result.stats.query_ms,
        es_took_ms: result.stats.es_took_ms,
      });
      this.logger.info(
        `entity graph traversal hop ${hop.hop_number} (${hop.name}): ${result.stats.edges_added} edges, ${result.stats.new_nodes} new nodes, stop_reason="${result.stop_reason}"`
      );
      if (stopReason !== '') break;
    }
    const hopsMs = elapsedMs(hopsStartedAt);

    // Every node, seed first, resolved once against the entity store of the space.
    const resolveNodesStartedAt = performance.now();
    const resolved = await resolveNodes(
      { nodes: [seedNode, ...nodes], indexPattern },
      this.executeResolve
    );
    const resolveNodesMs = elapsedMs(resolveNodesStartedAt);
    this.logger.debug(
      `entity graph traversal resolve: ${resolved.stats.resolved}/${resolved.stats.requested} nodes found in the entity store of space "${this.namespace}", ${resolved.stats.aliases} aliases`
    );

    const timings: GraphTraversalHopTimings = {
      resolve_index_ms: resolveIndexMs,
      hops_ms: hopsMs,
      query_ms: round1(hopStats.reduce((sum, hop) => sum + hop.query_ms, 0)),
      es_took_ms: hopStats.reduce((sum, hop) => sum + hop.es_took_ms, 0),
      resolve_nodes_ms: resolveNodesMs,
    };
    const output: GraphTraversalOutput = {
      scenario_id: plan.id,
      scenario_name: plan.name,
      seed_id: seedId,
      exclusions,
      until: stopConditions,
      until_matches: untilMatches,
      routes: traceGraphTraversalRoutes(seedId, edges, untilMatches),
      limits: plan.limits,
      hops_planned: plan.hops.length,
      hops_executed: hopsExecuted,
      stop_reason: stopReason,
      truncated,
      node_count: nodes.length + 1,
      edge_count: edges.length,
      nodes: resolved.nodes,
      edges,
      hops: hopStats,
    };
    return {
      execution_id: HOPS_GRAPH_TRAVERSAL_EXECUTION_ID,
      engine: 'hops',
      status: 'completed',
      output,
      duration_ms: Date.now() - startedAt,
      timings,
    };
  }

  /**
   * The concrete latest index behind the space's alias, which `LOOKUP JOIN` needs by name.
   * Without one (the store is not installed) the walk still runs; payloads then describe the
   * frontier node and nodes come back unresolved.
   */
  private async resolveLookupIndex(): Promise<string | undefined> {
    try {
      return await resolveLatestEntityIndex(this.esClient, this.namespace);
    } catch (error) {
      this.logger.debug(
        `entity graph traversal found no latest entity index in space "${this.namespace}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return undefined;
    }
  }

  private executeHop(hop: EntityGraphTraversalExpandedHop): ExecuteHopQuery {
    return async ({ query, params }) => {
      this.logger.info(
        `entity graph traversal hop ${hop.hop_number} (${hop.name}): ${params.length} frontier ids, query:\n${query}`
      );
      return this.query(query, params, `Hop "${hop.name}"`);
    };
  }

  private readonly executeResolve: ExecuteResolveQuery = async ({ query, params }) => {
    this.logger.debug(
      `entity graph traversal resolve: ${params.length} node ids, query:\n${query}`
    );
    return this.query(query, params, 'Resolve');
  };

  private async query(query: string, params: HopQueryParam[], what: string): Promise<EsqlResult> {
    const response = await this.esClient.esql.query({ query, params, drop_null_columns: false });
    const typed = response as unknown as Partial<EsqlResult>;
    if (!Array.isArray(typed.columns) || !Array.isArray(typed.values)) {
      throw new Error(`${what} ES|QL response did not contain columns and values arrays`);
    }
    return {
      columns: typed.columns,
      values: typed.values,
      ...(typeof typed.took === 'number' && { took: typed.took }),
    };
  }
}

const round1 = (value: number): number => Math.round(value * 10) / 10;
