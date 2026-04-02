/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetchDiscoveryQueries } from './use_fetch_discovery_queries';

/**
 * Returns the count and IDs of promotable (draft/not-yet-promoted) queries for a specific stream.
 *
 * perPage is set high (1000) to ensure we always capture all draft queries in a single request.
 * The decision to set 1_000 can be found here - https://github.com/elastic/streams-program/blob/e7a11a8a3414a9f581d504b0840ff5d93f6e8564/docs/significant-events/design-decisions/2026-03-31-promote-query-default-count.md
 * The API returns `total` regardless of page size, so the count is always accurate.
 * IDs are used by the promote action — a hard cap would silently leave queries un-promoted.
 * In practice a stream will never have anywhere near 1000 simultaneous draft queries.
 */
export function usePromotableQueries(streamName: string) {
  const result = useFetchDiscoveryQueries({
    name: streamName,
    status: ['draft'],
    page: 1,
    perPage: 1_000,
  });

  return {
    count: result.data?.total ?? 0,
    queries: result.data?.queries ?? [],
    queryIds: result.data?.queries.map((q) => q.query.id) ?? [],
    isLoading: result.isLoading,
    refetch: result.refetch,
  };
}
