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
  GraphTraversalStopCondition,
  RunGraphTraversalResponse,
} from '../../../../common/graph_traversal';
import { GraphTraversalError } from '../graph_traversal_error';
import { resolveLatestEntityIndex } from '../resolve_latest_entity_index';
import { buildEntityLookupQuery, buildGraphExpandStatement } from './build_graph_expand';
import { mapGraphExpandResult, readEntity, type EsqlResult } from './map_graph_expand_result';

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
  until?: GraphTraversalStopCondition[];
}

/**
 * Runs a traversal scenario as one ES|QL `GRAPH EXPAND` statement over the entity store's
 * latest index instead of the workflow: the scenario's relationship keys are the statement's
 * `TO` fields, Elasticsearch walks them with the scenario's limits and direction, and a
 * `LOOKUP JOIN` on the same (lookup-mode) index attaches each reached node's entity document.
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
    until,
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
    const indexPattern = getLatestEntityIndexPattern(this.namespace);
    const lookupIndex = await this.resolveLookupIndex();
    const statement = buildGraphExpandStatement({
      plan,
      indexPattern,
      lookupIndex,
      seedId,
      lookback,
      exclusions,
      until,
    });
    this.logger.debug(
      `entity graph traversal (ES|QL) scenario "${plan.id}" from ${seedId}, issuing:\n${
        statement.query
      }\nparams: ${JSON.stringify(statement.params)}`
    );
    const [result, seed] = await Promise.all([
      this.execute(statement.query, statement.params),
      this.lookupSeed(indexPattern, seedId, plan.seed.type),
    ]);
    const mapped = mapGraphExpandResult(result, statement, plan, seed);
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
        limits: plan.limits,
        ...(exclusions !== undefined && { exclusions }),
        until: [...plan.until, ...(until ?? [])],
      },
      duration_ms: Date.now() - startedAt,
    };
  }

  /**
   * The concrete latest index behind the space's alias, which `LOOKUP JOIN` needs by name.
   * Without one (the store is not installed) the walk still runs; nodes come back unresolved.
   */
  private async resolveLookupIndex(): Promise<string | undefined> {
    try {
      return await resolveLatestEntityIndex(this.esClient, this.namespace);
    } catch (error) {
      this.logger.debug(
        `entity graph traversal (ES|QL) found no latest entity index in space "${
          this.namespace
        }": ${error instanceof Error ? error.message : String(error)}`
      );
      return undefined;
    }
  }

  /** The seed is not a walk row, so its entity document is read on its own. */
  private async lookupSeed(
    indexPattern: string,
    seedId: string,
    type: string
  ): Promise<GraphTraversalNode> {
    const node: GraphTraversalNode = { id: seedId, hop: 0, via: 'seed', type, euid: seedId };
    try {
      const { query, params } = buildEntityLookupQuery(indexPattern, seedId);
      const result = await this.execute(query, params);
      const row = result.values[0];
      const stored = row
        ? readEntity((name) => {
            const index = result.columns.findIndex((c) => c.name === name);
            return index >= 0 ? row[index] : undefined;
          })
        : undefined;
      return {
        ...node,
        resolved: stored !== undefined,
        ...(stored?.resolvedTo !== undefined && { canonical_euid: stored.resolvedTo }),
        ...(stored && { entity: stored.entity }),
      };
    } catch (error) {
      this.logger.debug(
        `entity graph traversal (ES|QL) could not read the seed entity ${seedId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return { ...node, resolved: false };
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
