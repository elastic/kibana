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
  NotificationListItem,
  NotificationQueryParams,
  NotificationQueryParamsParsed,
  NotificationQueryResult,
} from '../../common/types';
import { getNotificationDataStreamClient } from '../storage/notification_data_stream';
import type { NotificationReadState } from './read_state';
import { severityTTLQuery } from './severity_ttl_query';

/**
 * Ceiling on collapsed notifications returned per query, after collapsing duplicates
 * and filtering by severity TTL and the from/to window. The client paginates over this
 * set; severity TTLs keep real volumes well under it.
 */
export const NOTIFICATION_QUERY_RESULT_LIMIT = 1000;

export interface NotificationQueryDeps {
  dataStreams: DataStreamsStart;
  logger: Logger;
}

/**
 * Doc-level filters. Only attributes that are identical across all copies of a notification
 * (`namespace`, `type`) may filter here — a doc-level filter on mutable state would change
 * which copy represents the collapsed group. `severity` is mutable, so it is applied
 * post-collapse against the representative. `from`/`to` defines which copies are candidates
 * for the window: a notification appears if any copy falls inside it, represented by its
 * newest in-window copy.
 */
const buildFilters = (params: NotificationQueryParamsParsed): QueryDslQueryContainer[] => {
  const { namespace, type, from, to } = params;
  const filters: QueryDslQueryContainer[] = [severityTTLQuery('visible')];
  if (namespace) {
    filters.push({ term: { namespace } });
  }
  if (type) {
    filters.push({ term: { type } });
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
 * - Return only the newest in-window doc per `notification_id`, collapse duplicates.
 * - Filter by severity TTL, namespace, type, and time-range in ES; by severity on the
 *   collapsed representative.
 * - With read state, annotate each item with `isRead` — read if the id is individually
 *   acknowledged (`read`, durable across re-pushes) or the representative is at or before
 *   the `readAllBefore` marker (so a re-push after it resurfaces as unread) — and sort
 *   unread first, newest first within each; without it, sort by newest only.
 */
export const queryNotifications = async (
  deps: NotificationQueryDeps,
  params: NotificationQueryParams = {},
  readState?: NotificationReadState | Promise<NotificationReadState | undefined>
): Promise<NotificationQueryResult> => {
  const { dataStreams, logger } = deps;
  const validated = notificationQueryParamsSchema.parse(params);

  const client = await getNotificationDataStreamClient(dataStreams);
  // Over-fetch by one collapse group so a full page is distinguishable from a truncated one
  const [response, resolvedReadState] = await Promise.all([
    client.search({
      query: { bool: { filter: buildFilters(validated) } },
      collapse: { field: 'notification_id' },
      sort: [{ '@timestamp': 'desc' }, { notification_id: 'asc' }],
      size: NOTIFICATION_QUERY_RESULT_LIMIT + 1,
      track_total_hits: false,
    }),
    readState,
  ]);

  const truncated = response.hits.hits.length > NOTIFICATION_QUERY_RESULT_LIMIT;
  const hits = response.hits.hits.slice(0, NOTIFICATION_QUERY_RESULT_LIMIT);

  const readSet = new Set(resolvedReadState?.read);
  const readAllBeforeMs = resolvedReadState ? Date.parse(resolvedReadState.readAllBefore) : NaN;

  const items: NotificationListItem[] = [];
  const malformedIds: string[] = [];
  for (const hit of hits) {
    const parsed = notificationReadSchema.safeParse(hit._source);
    if (!parsed.success) {
      malformedIds.push(hit._id ?? 'unknown');
      continue;
    }
    const notification = parsed.data;
    if (validated.severity?.length && !validated.severity.includes(notification.severity)) {
      continue;
    }
    items.push(
      resolvedReadState
        ? {
            ...notification,
            isRead:
              readSet.has(notification.notification_id) ||
              Date.parse(notification['@timestamp']) <= readAllBeforeMs,
          }
        : notification
    );
  }

  if (malformedIds.length) {
    logger.debug(
      `Dropped ${malformedIds.length} malformed notification docs. Sample: ${malformedIds
        .slice(0, 10)
        .join(', ')}`
    );
  }

  if (resolvedReadState) {
    // Unread first; the stable sort keeps the fetch's newest-first order within each group
    items.sort((a, b) => Number(a.isRead) - Number(b.isRead));
  }

  return { items, truncated };
};
