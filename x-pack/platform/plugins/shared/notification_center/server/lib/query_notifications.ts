/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import { notificationReadSchema, SEVERITY_TTL_DAYS } from '../../common/notification_schema';
import type { Notification, Severity } from '../../common/types';
import { getNotificationDataStreamClient } from '../storage/notification_data_stream';

/**
 * Ceiling on collapsed notifications fetched per query. Pagination happens in
 * memory (read-state annotation will join per-user data that ES cannot see);
 * severity TTLs and curated producers keep real volumes far under this.
 */
export const COLLAPSED_GROUP_LIMIT = 1000;

export interface NotificationQueryParams {
  namespace?: string;
  type?: string;
  severity?: Severity[];
  /** ISO lower bound on `@timestamp`, inclusive. */
  from?: string;
  /** ISO upper bound on `@timestamp`, inclusive. */
  to?: string;
  /** 1-based page, defaults to 1. */
  page?: number;
  /** Page size, defaults to 20. */
  perPage?: number;
}

export interface NotificationQueryResult {
  items: Notification[];
  /** Collapsed notifications matching all filters. */
  total: number;
}

export interface NotificationQueryDeps {
  dataStreams: DataStreamsStart;
  logger: Logger;
}

const DEFAULT_PER_PAGE = 20;

/** Severities grouped by TTL so the horizon filter emits one clause per window. */
const ttlGroups = Object.entries(SEVERITY_TTL_DAYS).reduce<Map<number, Severity[]>>(
  (groups, [severity, days]) => {
    groups.set(days, [...(groups.get(days) ?? []), severity as Severity]);
    return groups;
  },
  new Map()
);

/** Docs older than their severity's TTL are invisible even before cleanup deletes them. */
const horizonFilter = (): QueryDslQueryContainer => ({
  bool: {
    should: [...ttlGroups.entries()].map(([days, severities]) => ({
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
  const filters: QueryDslQueryContainer[] = [horizonFilter()];
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
 * Fetch the notification list: latest doc per `notification_id` (field collapse),
 * severity-TTL horizon, attribute and time-range filters, newest first.
 *
 * Per-user read-state annotation (`isRead`, unread counts, read/unread filtering)
 * is a follow-up on top of this function; it joins user storage data ES cannot
 * see, which is why pagination is already applied in memory here.
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
    size: COLLAPSED_GROUP_LIMIT,
    track_total_hits: false,
  });

  const notifications = response.hits.hits.flatMap((hit): Notification[] => {
    const parsed = notificationReadSchema.safeParse(hit._source);
    if (!parsed.success) {
      logger.debug(`Dropping malformed notification doc ${hit._id}: ${parsed.error.message}`);
      return [];
    }
    return [parsed.data];
  });

  const page = params.page ?? 1;
  const perPage = params.perPage ?? DEFAULT_PER_PAGE;
  const start = (page - 1) * perPage;

  return {
    items: notifications.slice(start, start + perPage),
    total: notifications.length,
  };
};
