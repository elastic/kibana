/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  ImprovementEnvelope,
  ImprovementStatus,
  ListImprovementsResponse,
} from '../../common/http_api/improvements';
import {
  getImprovementById,
  getImprovementHistory,
  getImprovements,
  getImprovementsByIds,
} from './read';
import type { ImprovementsStorageClient } from './storage';
import { createImprovementsStorageClient } from './storage';

/**
 * Improvements-store API. Every call is scoped to a Kibana space, which maps to a per-space index,
 * mirroring how signals are stored.
 */
export interface ImprovementsServiceApi {
  ensureIndex(spaceId: string): Promise<void>;
  write(spaceId: string, improvements: ImprovementEnvelope[]): Promise<void>;
  update(spaceId: string, improvement: ImprovementEnvelope): Promise<void>;
  list(
    spaceId: string,
    args: {
      aiIndexId: string;
      statuses?: readonly ImprovementStatus[];
      from: number;
      size: number;
    }
  ): Promise<ListImprovementsResponse>;
  history(
    spaceId: string,
    args: { aiIndexId: string; size: number }
  ): Promise<ImprovementEnvelope[]>;
  getByIds(spaceId: string, improvementIds: string[]): Promise<ImprovementEnvelope[]>;
  getById(spaceId: string, improvementId: string): Promise<ImprovementEnvelope | undefined>;
}

/**
 * Owns the per-space `.contextengine-improvements-<space>` indices. Suggestions are only ever
 * appended or transitioned through their review lifecycle; there is no delete path.
 *
 * Reads go through here rather than on the caller's own client because the index is plugin-owned
 * review metadata that only Kibana's internal user has privileges on. The authorization boundary is
 * the route's Context Engine privileges plus the space scoping every method takes, the same way the
 * AI index registry treats `.contextengine-ai-indices`. Applying an approved improvement still runs
 * on the caller's client, so a user can never change data they could not change themselves.
 */
export class ImprovementsService implements ImprovementsServiceApi {
  private readonly esClient: ElasticsearchClient;
  private readonly logger: Logger;
  private readonly clientsBySpace = new Map<string, ImprovementsStorageClient>();

  constructor({ esClient, logger }: { esClient: ElasticsearchClient; logger: Logger }) {
    this.esClient = esClient;
    this.logger = logger;
  }

  private clientFor(spaceId: string): ImprovementsStorageClient {
    let client = this.clientsBySpace.get(spaceId);
    if (!client) {
      client = createImprovementsStorageClient({
        esClient: this.esClient,
        logger: this.logger,
        spaceId,
      });
      this.clientsBySpace.set(spaceId, client);
    }
    return client;
  }

  /** Reconciles the space's improvements index mappings if it exists; the index is created lazily on first write. */
  async ensureIndex(spaceId: string): Promise<void> {
    await this.clientFor(spaceId).reconcileMappings();
  }

  /**
   * Bulk-writes improvements, keyed by `improvement_id` so a re-run overwrites rather than
   * duplicates. Refreshes because a run writes a handful of documents that the review UI reads as
   * soon as the run reports finished.
   */
  async write(spaceId: string, improvements: ImprovementEnvelope[]): Promise<void> {
    if (improvements.length === 0) {
      return;
    }
    await this.clientFor(spaceId).bulk({
      operations: improvements.map((improvement) => ({
        index: { _id: improvement.improvement_id, document: improvement },
      })),
      refresh: 'wait_for',
      throwOnFail: true,
    });
  }

  /**
   * Persists a lifecycle transition. Refreshes so the review UI, which re-reads immediately after
   * an approve or reject, does not show the pre-transition state.
   */
  async update(spaceId: string, improvement: ImprovementEnvelope): Promise<void> {
    await this.clientFor(spaceId).index({
      id: improvement.improvement_id,
      document: improvement,
      refresh: 'wait_for',
    });
  }

  async list(
    spaceId: string,
    {
      aiIndexId,
      statuses,
      from,
      size,
    }: { aiIndexId: string; statuses?: readonly ImprovementStatus[]; from: number; size: number }
  ): Promise<ListImprovementsResponse> {
    return getImprovements(this.esClient, { spaceId, aiIndexId, statuses, from, size });
  }

  async history(
    spaceId: string,
    { aiIndexId, size }: { aiIndexId: string; size: number }
  ): Promise<ImprovementEnvelope[]> {
    return getImprovementHistory(this.esClient, { spaceId, aiIndexId, size });
  }

  async getByIds(spaceId: string, improvementIds: string[]): Promise<ImprovementEnvelope[]> {
    return getImprovementsByIds(this.esClient, { spaceId, improvementIds });
  }

  async getById(spaceId: string, improvementId: string): Promise<ImprovementEnvelope | undefined> {
    return getImprovementById(this.esClient, { spaceId, improvementId });
  }
}
