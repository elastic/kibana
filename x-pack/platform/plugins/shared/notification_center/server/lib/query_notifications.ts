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

/**
 * Max number of results the client will get back per query. This is enforced on the
 * query results after collapsing duplicates. Meant as an arbitrary start point. Cleanup
 * task on expired notifications should keep real volumes well under it.
 */
export const NOTIFICATION_QUERY_RESULT_LIMIT = 1000;

export interface NotificationQueryDeps {
  dataStreams: DataStreamsStart;
  logger: Logger;
}

/**
 * These doc-level filters are applied to the query before collapsing duplicates.
 *
 * @param params - The query parameters parsed from the request.
 * @returns The filter object for the DSL query.
 */
const buildFilters = (params: NotificationQueryParamsParsed): QueryDslQueryContainer[] => {
  const { namespace, type, from, to } = params;
  const filters: QueryDslQueryContainer[] = [];
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
 * - Return only the newest doc per `notification_id`, collapse duplicates.
 * - Filter by namespace, type and time-range
 * - Sort by newest first.
 * - Annotate results with read state if provided (headless consumers don't have a read state)
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
