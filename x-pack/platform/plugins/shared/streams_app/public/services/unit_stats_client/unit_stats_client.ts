/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { MAX_STREAMS_UNIT_STATS_COMPONENTS } from '@kbn/streams-schema';
import type { StreamsUnit } from '@kbn/streams-schema';
import { mapStatsResponse } from './map_stats_response';
import type { StatsFetchRequest, UnitStatsClient } from './types';

// `as const` keeps the literal type, which the route repository client uses to type the call.
const UNIT_STATS_ENDPOINT = 'POST /internal/streams/unit/{id}/_stats' as const;

export const buildStatsRequestBody = ({
  components,
  window,
}: StatsFetchRequest): StreamsUnit.StatsRequest => ({
  // Always explicit. Omitting `components` asks for every component and fails above the limit.
  components,
  ...(window.kind === 'range'
    ? { filter: { time_range: { start: window.start, end: window.end } } }
    : {}),
});

/**
 * An HTTP error of the whole request is thrown as the repository client raises it. An abort
 * rejects too, so the caller decides from its own signal whether it is an error.
 */
export const createUnitStatsClient = ({
  streamsRepositoryClient,
  unitId,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
  unitId: string;
}): UnitStatsClient => ({
  fetchStats: async (request, { signal }) => {
    if (request.components.length > MAX_STREAMS_UNIT_STATS_COMPONENTS) {
      throw new Error(
        `A stats request takes at most ${MAX_STREAMS_UNIT_STATS_COMPONENTS} components, got ${request.components.length}`
      );
    }

    const response = await streamsRepositoryClient.fetch(UNIT_STATS_ENDPOINT, {
      params: { path: { id: unitId }, body: buildStatsRequestBody(request) },
      signal,
    });

    return mapStatsResponse(response, request.components);
  },
});
