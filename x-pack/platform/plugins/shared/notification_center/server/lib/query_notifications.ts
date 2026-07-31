/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import { notificationReadSchema, SEVERITY_TTL_GROUPS } from '../../common/notification_schema';
import type {
  Notification,
  NotificationQueryParams,
  NotificationQueryResult,
} from '../../common/types';
import { getNotificationDataStreamClient } from '../storage/notification_data_stream';

/**
 * Ceiling on collapsed notifications returned per query, after collapsing duplicates
 * and filtering by severity TTL. The client paginates over this set and (as a follow-up)
 * annotates it with the user's read state; severity TTLs keep real volumes well under it.
 */
export const NOTIFICATION_QUERY_RESULT_LIMIT = 1000;

export interface NotificationQueryDeps {
  dataStreams: DataStreamsStart;
  logger: Logger;
}

/** Docs older than their severity's TTL are invisible even before cleanup deletes them. */
const severityTTLFilter = (): QueryDslQueryContainer => ({
  bool: {
    should: [...SEVERITY_TTL_GROUPS.entries()].map(([days, severities]) => ({
      bool: {
        filter: [
          { terms: { severity: severities } },
          { range: { '@timestamp': { gte: `now-${days}d` } } },
        ],
      },
    })),
    minimum_should_match: 1,
  },
});

const buildFilters = (params: NotificationQueryParams): QueryDslQueryContainer[] => {
  const { namespace, type, severity, from, to } = params;
  const filters: QueryDslQueryContainer[] = [severityTTLFilter()];
  if (namespace) {
    filters.push({ term: { namespace } });
  }
  if (type) {
    filters.push({ term: { type } });
  }
  if (severity?.length) {
    filters.push({ terms: { severity } });
  }
  if (from || to) {
    filters.push({
      range: { '@timestamp': { ...(from && { gte: from }), ...(to && { lte: to }) } },
    });
  }
  return filters;
};

/**
 * Fetch the notification list
 * - Return only the newest doc per `notification_id`, collapse duplicates.
 * - Filter by severity TTL, namespace, type, severity and time-range.
 * - Sort by newest first.
 */
export const queryNotifications = async (
  deps: NotificationQueryDeps,
  params: NotificationQueryParams = {}
): Promise<NotificationQueryResult> => {
  const { dataStreams, logger } = deps;

  const client = await getNotificationDataStreamClient(dataStreams);
  const response = await client.search({
    query: { bool: { filter: buildFilters(params) } },
    collapse: { field: 'notification_id' },
    sort: [{ '@timestamp': 'desc' }, { notification_id: 'asc' }],
    size: NOTIFICATION_QUERY_RESULT_LIMIT,
    track_total_hits: false,
  });

  const items = response.hits.hits.flatMap((hit): Notification[] => {
    const parsed = notificationReadSchema.safeParse(hit._source);
    if (!parsed.success) {
      logger.debug(`Dropping malformed notification doc ${hit._id}: ${parsed.error.message}`);
      return [];
    }
    return [parsed.data];
  });

  return {
    items,
    truncated: response.hits.hits.length === NOTIFICATION_QUERY_RESULT_LIMIT,
  };
};
