/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import { z } from '@kbn/zod/v4';
import {
  notificationQueryParamsSchema,
  notificationReadSchema,
} from '../../common/notification_schema';
import type {
  Notification,
  NotificationListItem,
  NotificationQueryParams,
  NotificationQueryParamsParsed,
  NotificationQueryResult,
} from '../../common/types';
import { getNotificationDataStreamClient } from '../storage/notification_data_stream';
import { severityTTLQuery } from './severity_ttl_query';

/**
 * Ceiling on collapsed notifications returned per query, after collapsing duplicates
 * and filtering by severity TTL. The client paginates over this set; severity TTLs
 * keep real volumes well under it.
 */
export const NOTIFICATION_QUERY_RESULT_LIMIT = 1000;

export interface NotificationQueryDeps {
  dataStreams: DataStreamsStart;
  logger: Logger;
}

/** Per-user read state used to annotate the list; absent for API-key callers without userStorage access. */
export interface NotificationReadState {
  read: string[];
  readAllBefore: string;
}

/** The shape of a collapsed hit carrying a notification's earliest copy. */
interface CollapsedHit {
  inner_hits?: Record<string, { hits: { hits: Array<{ _source?: unknown }> } }>;
}

const earliestCopySchema = z.object({ '@timestamp': z.iso.datetime() }).loose();

/**
 * Annotate a notification with the user's read state. `readAllBefore` is compared against the
 * id's oldest copy (from `inner_hits` in the collapse query). This is the "anchor".
 * Using the newest copy would flip a notification back to unread whenever a
 * plugin re-pushes it. Falls back to the item's own timestamp if the inner hit is missing.
 */
const annotateReadState = (
  notification: Notification,
  hit: CollapsedHit,
  { read, readAllBefore }: NotificationReadState
): NotificationListItem => {
  if (read.includes(notification.notification_id)) {
    return { ...notification, isRead: true };
  }
  const earliest = earliestCopySchema.safeParse(hit.inner_hits?.earliest?.hits.hits[0]?._source);
  const anchor = earliest.success ? earliest.data['@timestamp'] : notification['@timestamp'];
  return { ...notification, isRead: Date.parse(anchor) <= Date.parse(readAllBefore) };
};

const buildFilters = (params: NotificationQueryParamsParsed): QueryDslQueryContainer[] => {
  const { namespace, type, severity } = params;
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
  return filters;
};

/**
 * The from/to window is applied in-memory on the collapsed items instead of as a query filter.
 * The ES query must consider the whole range of timestamps in order to get the proper earliest copy
 * that we use as the "anchor" to check against the readAllBefore marker. We don't want
 * a from/to window to change which copy is used as the anchor.
 */
const withinWindow = (timestamp: string, { from, to }: NotificationQueryParamsParsed): boolean => {
  const instant = Date.parse(timestamp);
  return (!from || instant >= Date.parse(from)) && (!to || instant <= Date.parse(to));
};

/**
 * Fetch the notification list
 * - Return only the newest doc per `notification_id`, collapse duplicates.
 * - Filter by severity TTL, namespace, type, severity and (in-memory) time-range.
 * - With `readState`, annotate each item with `isRead` and sort unread first,
 *   newest first within each; without it, sort by newest only.
 */
export const queryNotifications = async (
  deps: NotificationQueryDeps,
  params: NotificationQueryParams = {},
  readState?: NotificationReadState
): Promise<NotificationQueryResult> => {
  const { dataStreams, logger } = deps;
  const validated = notificationQueryParamsSchema.parse(params);

  const client = await getNotificationDataStreamClient(dataStreams);
  // Over-fetch by one collapse group so a full page is distinguishable from a truncated one
  const response = await client.search({
    query: { bool: { filter: buildFilters(validated) } },
    collapse: {
      field: 'notification_id',
      // Use the oldest copy of each unique notification_id. readAllBefore marker will be compared against this
      // "anchor" to determine if that notification_id should show as unread or read.
      ...(readState && {
        inner_hits: {
          name: 'earliest',
          size: 1,
          sort: [{ '@timestamp': 'asc' }],
          _source: ['@timestamp'],
        },
      }),
    },
    sort: [{ '@timestamp': 'desc' }, { notification_id: 'asc' }],
    size: NOTIFICATION_QUERY_RESULT_LIMIT + 1,
    track_total_hits: false,
  });

  const truncated = response.hits.hits.length > NOTIFICATION_QUERY_RESULT_LIMIT;
  const hits = response.hits.hits.slice(0, NOTIFICATION_QUERY_RESULT_LIMIT);

  const items: NotificationListItem[] = [];
  const malformedIds: string[] = [];
  for (const hit of hits) {
    const parsed = notificationReadSchema.safeParse(hit._source);
    if (parsed.success) {
      if (withinWindow(parsed.data['@timestamp'], validated)) {
        items.push(readState ? annotateReadState(parsed.data, hit, readState) : parsed.data);
      }
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

  if (readState) {
    // Unread first; the stable sort keeps the fetch's newest-first order within each group
    items.sort((a, b) => Number(a.isRead) - Number(b.isRead));
  }

  return { items, truncated };
};
