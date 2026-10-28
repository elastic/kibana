/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  listEntityGraphTraversalScenarioIds,
  loadEntityGraphTraversalPlan,
} from '@kbn/workflows/managed';
import { getLatestEntityIndexPattern } from '../../../../common/domain/entity_index';
import type {
  GraphTraversalExclusion,
  GraphTraversalNode,
  RunGraphTraversalResponse,
} from '../../../../common/graph_traversal';
import { GraphTraversalError } from '../graph_traversal_error';
import { buildGraphExpandStatement } from './build_graph_expand';
import { mapGraphExpandResult, type EsqlResult } from './map_graph_expand_result';
import { resolveGraphTraversalNodes } from './resolve_nodes';

export const ESQL_GRAPH_TRAVERSAL_EXECUTION_ID = 'esql';

export interface EsqlGraphTraversalClientDeps {
  logger: Logger;
  namespace: string;
  esClient: ElasticsearchClient;
}

export interface RunEsqlGraphTraversalParams {
  scenarioId: string;
  seedId: string;
  lookback?: string;
  maxHops?: number;
  exclusions?: GraphTraversalExclusion[];
}

/**
 * Runs a traversal scenario as one ES|QL `GRAPH EXPAND` statement instead of the workflow:
 * the scenario's hops are translated into a subquery edge whose ids are computed with the
 * entity store's identity rules, Elasticsearch walks it with the scenario's limits, and the
 * reached nodes are resolved against the entity store the way the workflow's last step does.
 * `GRAPH EXPAND` exists in snapshot builds only; the statement fails with 400 elsewhere.
 */
export class EsqlGraphTraversalClient {
  private readonly logger: Logger;
  private readonly namespace: string;
  private readonly esClient: ElasticsearchClient;

  constructor({ logger, namespace, esClient }: EsqlGraphTraversalClientDeps) {
    this.logger = logger;
    this.namespace = namespace;
    this.esClient = esClient;
  }

  public async run({
    scenarioId,
    seedId,
    lookback,
    maxHops,
    exclusions,
  }: RunEsqlGraphTraversalParams): Promise<RunGraphTraversalResponse> {
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
    const statement = buildGraphExpandStatement({ plan, seedId, lookback, exclusions });
    this.logger.debug(
      `entity graph traversal (ES|QL) scenario "${plan.id}" from ${seedId}:\n${statement.query}`
    );
    const result = await this.execute(statement.query, statement.params);
    const mapped = mapGraphExpandResult(result, statement, plan, seedId);
    const nodes = await this.resolveNodes(mapped.output.nodes);
    if (mapped.hubs.length > 0) {
      this.logger.debug(
        `entity graph traversal (ES|QL) skipped hubs: ${mapped.hubs
          .map((hub) => `${hub.id} (${hub.degree})`)
          .join(', ')}`
      );
    }
    return {
      execution_id: ESQL_GRAPH_TRAVERSAL_EXECUTION_ID,
      engine: 'esql',
      status: 'completed',
      output: {
        scenario_id: plan.id,
        scenario_name: plan.name,
        seed_id: seedId,
        ...mapped.output,
        nodes,
        limits: plan.limits,
        ...(exclusions !== undefined && { exclusions }),
      },
      duration_ms: Date.now() - startedAt,
    };
  }

  /** Nodes stay unresolved when the space has no entity store index yet. */
  private async resolveNodes(nodes: GraphTraversalNode[]): Promise<GraphTraversalNode[]> {
    try {
      return await resolveGraphTraversalNodes(
        nodes,
        getLatestEntityIndexPattern(this.namespace),
        ({ query, params }) => this.execute(query, params)
      );
    } catch (error) {
      this.logger.debug(
        `entity graph traversal (ES|QL) could not resolve nodes against the entity store: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return nodes.map((node) => ({ ...node, euid: node.id, resolved: false }));
    }
  }

  private async execute(query: string, params: string[]): Promise<EsqlResult> {
    try {
      const response = await this.esClient.esql.query({ query, params, drop_null_columns: false });
      const typed = response as unknown as Partial<EsqlResult>;
      if (!Array.isArray(typed.columns) || !Array.isArray(typed.values)) {
        throw new Error('ES|QL response did not contain columns and values arrays');
      }
      return { columns: typed.columns, values: typed.values };
    } catch (error) {
      const status = (error as { statusCode?: number; meta?: { statusCode?: number } }).meta
        ?.statusCode;
      if (status === 400) {
        const message = error instanceof Error ? error.message : String(error);
        throw new GraphTraversalError(`GRAPH EXPAND statement was rejected: ${message}`, 400);
      }
      throw error;
    }
  }
}
