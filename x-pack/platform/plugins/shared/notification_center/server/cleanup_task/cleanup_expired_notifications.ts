/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsCompositeAggregate,
  AggregationsCompositeAggregateKey,
  AggregationsCompositeBucket,
  AggregationsMaxAggregate,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { inject, injectable } from 'inversify';
import { Logger } from '@kbn/core-di';
import { InternalElasticsearchClient } from '@kbn/core-di-server';
import type { ElasticsearchClient, Logger as ILogger } from '@kbn/core/server';
import { SEVERITY_TTL_GROUPS } from '../../common/notification_schema';
import { NOTIFICATION_DATA_STREAM_NAME } from '../storage/notification_data_stream';

export const CLEANUP_PAGE_SIZE = 500;

interface ExpiredNotificationGroup {
  notificationId: string;
  newestExpiredAt: number;
}

interface CleanupAggregations {
  expired_groups: AggregationsCompositeAggregate;
}

/** Match every notification copy that has passed its severity retention window. */
export const buildCleanupQuery = (): QueryDslQueryContainer => ({
  bool: {
    should: [...SEVERITY_TTL_GROUPS.entries()].map(([days, severities]) => ({
      bool: {
        filter: [
          { terms: { severity: severities } },
          { range: { '@timestamp': { lt: `now-${days}d/d` } } },
        ],
      },
    })),
    minimum_should_match: 1,
  },
});

/** Delete a group's expired history without touching copies written after the aggregation. */
export const buildGroupCleanupQuery = (
  groups: readonly ExpiredNotificationGroup[]
): QueryDslQueryContainer => ({
  bool: {
    should: groups.map(({ notificationId, newestExpiredAt }) => ({
      bool: {
        filter: [
          { term: { notification_id: notificationId } },
          { range: { '@timestamp': { lte: newestExpiredAt } } },
        ],
      },
    })),
    minimum_should_match: 1,
  },
});

/** Enforces the per-severity retention windows over the notification data stream. */
@injectable()
export class NotificationCleanupService {
  constructor(
    @inject(InternalElasticsearchClient) private readonly esClient: ElasticsearchClient,
    @inject(Logger) private readonly logger: ILogger
  ) {}

  /** Task-runner entry point: a cleanup failure is logged, never surfaced to Task Manager. */
  public async run(signal: AbortSignal): Promise<void> {
    try {
      await this.cleanupExpiredNotifications(signal);
    } catch (err) {
      this.logger.error(`Notification Center cleanup task failed: ${err.message}`);
    }
  }

  /** Remove expired notification groups in bounded pages. */
  public async cleanupExpiredNotifications(signal: AbortSignal): Promise<void> {
    let after: AggregationsCompositeAggregateKey | undefined;

    do {
      if (signal.aborted) {
        return;
      }

      const page = await this.getExpiredGroups(after, signal);
      if (page.groups.length === 0) {
        return;
      }

      await this.esClient.deleteByQuery(
        {
          index: NOTIFICATION_DATA_STREAM_NAME,
          ignore_unavailable: true,
          conflicts: 'proceed',
          refresh: false,
          query: buildGroupCleanupQuery(page.groups),
        },
        { signal }
      );
      after = page.after;
    } while (after);
  }

  private async getExpiredGroups(
    after: AggregationsCompositeAggregateKey | undefined,
    signal: AbortSignal
  ) {
    const response = await this.esClient.search<never, CleanupAggregations>(
      {
        index: NOTIFICATION_DATA_STREAM_NAME,
        ignore_unavailable: true,
        size: 0,
        track_total_hits: false,
        query: buildCleanupQuery(),
        aggs: {
          expired_groups: {
            composite: {
              size: CLEANUP_PAGE_SIZE,
              sources: [{ notification_id: { terms: { field: 'notification_id' } } }],
              ...(after ? { after } : {}),
            },
            aggs: { newest_expired_at: { max: { field: '@timestamp' } } },
          },
        },
      },
      { signal }
    );

    const aggregation = response.aggregations?.expired_groups;
    const buckets = (aggregation?.buckets ?? []) as AggregationsCompositeBucket[];
    const groups = buckets.flatMap((bucket) => {
      const notificationId = bucket.key.notification_id;
      const newestExpiredAt = (bucket.newest_expired_at as AggregationsMaxAggregate).value;
      return typeof notificationId === 'string' && newestExpiredAt !== null
        ? [{ notificationId, newestExpiredAt }]
        : [];
    });

    return { groups, after: aggregation?.after_key };
  }
}
