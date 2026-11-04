/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/server-route-repository-client';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { MAX_STREAMS_UNIT_STATS_COMPONENTS } from '@kbn/streams-schema';
import type { StreamsUnit } from '@kbn/streams-schema';
import { chunk } from 'lodash';
import { mapFailedRequest, mapStatsResponse } from './map_stats_response';
import type { MappedStatsResponse, StatsFetchRequest, UnitStatsClient } from './types';

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
 * The reason shown to the user when a stats request fails. It is the server's message when there
 * is one, for example that the user cannot read the stats. The message of an HTTP error is only
 * its status text.
 */
export const toFailureReason = (error: unknown): string => {
  if (isHttpFetchError(error) && typeof error.body?.message === 'string') {
    return error.body.message;
  }
  return error instanceof Error ? error.message : String(error);
};

/**
 * Takes any number of components and sends them in requests of at most the limit of the route,
 * one after another. The caller sees one response.
 *
 * - A group that fails gives its components an error, and the other groups still count.
 * - It throws, as the repository client raises it, only when no group succeeded. With a single
 *   group that is a failed request.
 * - An abort rejects, and no further group is sent. The caller decides from its own signal whether
 *   it is an error.
 */
export const createUnitStatsClient = ({
  streamsRepositoryClient,
  unitId,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
  unitId: string;
}): UnitStatsClient => ({
  fetchStats: async (request, { signal }) => {
    // An empty list is still one request, which gives the window of the response.
    const groups = chunk(request.components, MAX_STREAMS_UNIT_STATS_COMPONENTS);
    const responses: MappedStatsResponse[] = [];
    const failures: Array<Pick<MappedStatsResponse, 'destinations' | 'processors'>> = [];
    let firstError: unknown;

    for (const components of groups.length > 0 ? groups : [[]]) {
      signal.throwIfAborted();
      try {
        const response = await streamsRepositoryClient.fetch(UNIT_STATS_ENDPOINT, {
          params: {
            path: { id: unitId },
            body: buildStatsRequestBody({ components, window: request.window }),
          },
          signal,
        });
        responses.push(mapStatsResponse(response, components));
      } catch (error) {
        if (signal.aborted) {
          throw error;
        }
        firstError ??= error;
        failures.push(mapFailedRequest(components, toFailureReason(error)));
      }
    }

    if (responses.length === 0) {
      throw firstError;
    }

    return {
      destinations: Object.assign({}, ...[...responses, ...failures].map((r) => r.destinations)),
      processors: Object.assign({}, ...[...responses, ...failures].map((r) => r.processors)),
      window: responses[0].window,
    };
  },
});
