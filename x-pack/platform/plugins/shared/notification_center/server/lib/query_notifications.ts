/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import {
  notificationQueryParamsSchema,
  notificationReadSchema,
} from '../../common/notification_schema';
import type {
  Notification,
  NotificationQueryParams,
  NotificationQueryParamsParsed,
  NotificationQueryResult,
} from '../../common/types';
import { getNotificationDataStreamClient } from '../storage/notification_data_stream';
import { severityTTLQuery } from './severity_ttl_query';

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

const buildFilters = (params: NotificationQueryParamsParsed): QueryDslQueryContainer[] => {
  const { namespace, type, severity, from, to } = params;
  const filters: QueryDslQueryContainer[] = [severityTTLQuery('visible')];
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
    // Caller-supplied instants, passed through unrounded
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
  const validated = notificationQueryParamsSchema.parse(params);

  const client = await getNotificationDataStreamClient(dataStreams);
  // Over-fetch by one collapse group so a full page is distinguishable from a truncated one
  const response = await client.search({
    query: { bool: { filter: buildFilters(validated) } },
    collapse: { field: 'notification_id' },
    sort: [{ '@timestamp': 'desc' }, { notification_id: 'asc' }],
    size: NOTIFICATION_QUERY_RESULT_LIMIT + 1,
    track_total_hits: false,
  });

  const truncated = response.hits.hits.length > NOTIFICATION_QUERY_RESULT_LIMIT;
  const hits = response.hits.hits.slice(0, NOTIFICATION_QUERY_RESULT_LIMIT);

  const items: Notification[] = [];
  const malformedIds: string[] = [];
  for (const hit of hits) {
    const parsed = notificationReadSchema.safeParse(hit._source);
    if (parsed.success) {
      items.push(parsed.data);
    } else {
      malformedIds.push(hit._id ?? 'unknown');
    }
  }

  if (malformedIds.length) {
    logger.debug(
      `Dropped ${malformedIds.length} malformed notification docs. Sample: ${malformedIds
        .slice(0, 10)
        .join(', ')}`
    );
  }

  return { items, truncated };
};
