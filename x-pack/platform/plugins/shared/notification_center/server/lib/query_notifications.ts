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
import { isReadAt, type NotificationReadState } from './read_state';
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
 * Doc-level filters. Only attributes identical across every copy of a notification
 * (`namespace`, `type`) may filter here — a filter on mutable state would change which copy
 * represents the collapsed group, and with it the timestamp the read annotation anchors on.
 * `from`/`to` selects which copies are candidates for the window: a notification appears if
 * any copy falls inside it, represented by its newest in-window copy.
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
 * - Filter by severity TTL, namespace, type and time-range, all at the document level so
 *   the result limit bounds the filtered set.
 * - Sort by newest first, independent of read state: the server reports the caller's
 *   `isRead` but does not order by it, so the ordering is the same for every caller and a
 *   client tracking read state optimistically has nothing to reconcile.
 * - With read state, annotate each item with `isRead`; without it, omit the field.
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

  const items: NotificationListItem[] = [];
  const malformedIds: string[] = [];
  for (const hit of hits) {
    const parsed = notificationReadSchema.safeParse(hit._source);
    if (!parsed.success) {
      malformedIds.push(hit._id ?? 'unknown');
      continue;
    }
    const notification = parsed.data;
    items.push(
      resolvedReadState
        ? {
            ...notification,
            isRead: isReadAt(
              resolvedReadState,
              notification.notification_id,
              notification['@timestamp']
            ),
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

  return { items, truncated };
};
