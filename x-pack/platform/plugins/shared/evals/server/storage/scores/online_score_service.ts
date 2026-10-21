/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import type { Logger } from '@kbn/core/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import type { AnyIDataStreamClient, ClientSearchRequest } from '@kbn/data-streams';
import { EvaluationIndices, type ListOnlineScoresResponse } from '@kbn/evals-common';

export interface OnlineScoreIngestFailure {
  index: number;
  status: number;
  reason: string;
}

export interface BulkCreateOnlineScoresResult {
  created: number;
  skipped: number;
  errors: OnlineScoreIngestFailure[];
}

type OnlineScore = ListOnlineScoresResponse['data'][number];
export type OnlineScoreDocument = OnlineScore & { space_ids: string[] };
type DataStreamSearchResponse = Awaited<ReturnType<AnyIDataStreamClient['search']>>;

const ONLINE_SCORE_SOURCE_EXCLUDES = ['score.metadata'] as const;

export interface ListOnlineScoresParams {
  monitorId: string;
  spaceId: string;
  page: number;
  perPage: number;
}

export const computeOnlineScoreDocumentId = (
  document: Pick<OnlineScoreDocument, 'space_ids' | 'monitor' | 'trace_id' | 'evaluator' | 'score'>
): string => {
  const identity = JSON.stringify([
    [...document.space_ids].sort(),
    document.monitor.id,
    document.trace_id,
    document.evaluator.name,
    document.evaluator.version,
    document.score.name,
  ]);

  return createHash('sha256').update(identity, 'utf8').digest('hex');
};

export class OnlineScoreService {
  constructor(
    private readonly logger: Logger,
    private readonly coreDataStreams: DataStreamsStart
  ) {}

  private async getClient(): Promise<AnyIDataStreamClient> {
    return this.coreDataStreams.initializeClient(EvaluationIndices.ONLINE_SCORES);
  }

  public async search(request: ClientSearchRequest): Promise<DataStreamSearchResponse> {
    const client = await this.getClient();
    return client.search(request);
  }

  public async bulkCreate(
    documents: Array<Omit<OnlineScoreDocument, '@timestamp'>>
  ): Promise<BulkCreateOnlineScoresResult> {
    if (documents.length === 0) {
      return { created: 0, skipped: 0, errors: [] };
    }

    const timestamp = new Date().toISOString();
    const docsWithId = documents.map((document) => {
      const payload: OnlineScoreDocument = {
        '@timestamp': timestamp,
        ...document,
      };

      return {
        _id: computeOnlineScoreDocumentId(payload),
        ...payload,
      };
    });

    const client = await this.getClient();
    const response = await client.create({
      documents: docsWithId,
      refresh: 'wait_for',
    });

    let skipped = 0;
    const errors: OnlineScoreIngestFailure[] = [];

    response.items.forEach((item, index) => {
      const createItem = item.create;
      const status = createItem?.status;
      if (!status) {
        errors.push({
          index,
          status: 500,
          reason: 'unknown failure reason',
        });
        return;
      }

      if (status === 409) {
        skipped += 1;
        return;
      }

      if (status < 200 || status >= 300) {
        errors.push({
          index,
          status,
          reason: createItem.error?.reason ?? createItem.error?.type ?? 'unknown failure reason',
        });
      }
    });

    if (errors.length > 0) {
      this.logger.warn(
        `Online score ingestion had ${errors.length} failure(s): ${errors
          .map((error) => error.reason)
          .join('; ')}`
      );
    }

    return {
      created: docsWithId.length - skipped - errors.length,
      skipped,
      errors,
    };
  }

  public async list({
    monitorId,
    spaceId,
    page,
    perPage,
  }: ListOnlineScoresParams): Promise<ListOnlineScoresResponse> {
    const from = (page - 1) * perPage;
    const response = await this.search({
      from,
      size: perPage,
      _source_excludes: [...ONLINE_SCORE_SOURCE_EXCLUDES],
      sort: [{ '@timestamp': { order: 'desc' } }],
      query: {
        bool: {
          filter: [{ term: { 'monitor.id': monitorId } }, { term: { space_ids: spaceId } }],
        },
      },
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    return {
      total,
      data: response.hits.hits.flatMap((hit) => {
        if (!hit._source) {
          return [];
        }

        const { space_ids: _, ...onlineScore } = hit._source as OnlineScoreDocument;
        return [onlineScore];
      }),
    };
  }
}
