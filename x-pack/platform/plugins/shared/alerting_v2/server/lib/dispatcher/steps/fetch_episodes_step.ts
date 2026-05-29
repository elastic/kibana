/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { set } from '@kbn/safer-lodash-set';
import { inject, injectable } from 'inversify';
import type {
  AlertEpisode,
  AlertEpisodeData,
  DispatcherStep,
  DispatcherPipelineState,
  DispatcherStepOutput,
} from '../types';
import type { AlertEventSeverity } from '../../../resources/datastreams/alert_events';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { QueryServiceInternalToken } from '../../services/query_service/tokens';
import {
  LOOKBACK_WINDOW_MINUTES,
  SETTLE_BUFFER_SECONDS,
  TICK_LOOKBACK_CAP_MINUTES,
} from '../constants';
import { getDispatchableAlertEventsQuery } from '../queries';

interface RawAlertEpisode {
  last_event_timestamp: string;
  rule_id: string;
  group_hash: string;
  episode_id: string;
  episode_status: 'inactive' | 'pending' | 'active' | 'recovering';
  data_json: string | null;
  severity: AlertEventSeverity | null;
}

/**
 * `fetch_episodes` queries a bounded `@timestamp` window so the upstream rows
 * fed into `INLINE STATS` (and the IN-list flowing into `fetch_suppressions`)
 * stay small enough to never breach ES|QL sub-plan buffer or request-size
 * limits — even at peak ingest.
 *
 * Window semantics:
 *   - `windowStart`: the persisted `eventWatermark` on subsequent runs;
 *     `now − LOOKBACK_WINDOW_MINUTES` on cold start.
 *   - `windowEnd`: `min(windowStart + TICK_LOOKBACK_CAP_MINUTES, now − SETTLE_BUFFER_SECONDS)`.
 *     The cap bounds the row count fed into INLINE STATS so the ES|QL sub-plan
 *     buffer stays well under its 16.8 MB limit; the settle buffer absorbs
 *     Elasticsearch refresh-interval lag and modest clock skew between the
 *     rule executor and the dispatcher.
 *   - Lower bound is always `gte`. The boundary timestamp is re-included on
 *     every tick so any episode whose `last_event_timestamp` ties the previous
 *     watermark is retried — this is what closes the silent loss path when
 *     `LIMIT 10000` truncates a busy window. The per-`(rule_id, group_hash)`
 *     dedup in the ES|QL query (`last_fired < @timestamp`) filters out
 *     anything we already dispatched, so re-inclusion does not produce
 *     duplicate fires.
 *
 * Watermark semantics:
 *   - On a tick that returned episodes, `nextEventWatermark` is the
 *     `last_event_timestamp` of the latest episode actually returned (the last
 *     row in the SORT-asc result). The cursor advances at the rate of
 *     observed data, not wall clock, so a `LIMIT 10000` cut tail — which by
 *     construction has `last_event_timestamp >=` the new watermark — is
 *     picked up on the next tick.
 *   - On an empty window, the watermark advances to `windowEnd` so quiet
 *     periods don't re-read the same empty range forever.
 *   - On `step_error`, `dispatcher.ts` discards the watermark via
 *     `extractAdvanceableWatermark`, so the failed window is retried.
 *
 * Backlog/outage handling is implicit: the watermark advances at most one
 * cap per tick, so a long outage drains over many ticks with bounded work
 * per tick. When `windowEnd` collapses to `windowStart` (settle buffer ate
 * the entire window), the step halts without advancing the watermark, so
 * the next tick retries the same range.
 */
@injectable()
export class FetchEpisodesStep implements DispatcherStep {
  public readonly name = 'fetch_episodes';

  constructor(
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract
  ) {}

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { eventWatermark } = state.input;

    const windowStart = eventWatermark
      ? moment(eventWatermark)
      : moment().subtract(LOOKBACK_WINDOW_MINUTES, 'minutes');

    const cappedEnd = windowStart.clone().add(TICK_LOOKBACK_CAP_MINUTES, 'minutes');
    const safeNow = moment().subtract(SETTLE_BUFFER_SECONDS, 'seconds');
    const windowEnd = moment.min(cappedEnd, safeNow);

    if (windowEnd.isSameOrBefore(windowStart)) {
      return { type: 'halt', reason: 'no_episodes' };
    }

    const lowerBound = windowStart.toISOString();
    const upperBound = windowEnd.toISOString();

    const result = await this.queryService.executeQueryRows<RawAlertEpisode>({
      query: getDispatchableAlertEventsQuery().query,
      filter: {
        range: {
          '@timestamp': {
            gte: lowerBound,
            lte: upperBound,
          },
        },
      },
    });

    const episodes = parseAlertEpisodes(result);

    // Anchor the watermark to the latest episode actually returned. The ES|QL
    // query sorts `last_event_timestamp` ascending and `parseAlertEpisodes`
    // preserves that order, so the last element holds the highest timestamp
    // we observed. Empty windows fall back to `upperBound` so quiet periods
    // still progress toward `now − SETTLE_BUFFER_SECONDS`.
    const nextEventWatermark =
      episodes.length > 0 ? episodes[episodes.length - 1].last_event_timestamp : upperBound;

    if (episodes.length === 0) {
      return { type: 'halt', reason: 'no_episodes', data: { nextEventWatermark } };
    }

    return { type: 'continue', data: { episodes, nextEventWatermark } };
  }
}

export function parseAlertEpisodes(raw: RawAlertEpisode[]): AlertEpisode[] {
  return raw.map(({ data_json, severity, ...rest }) => ({
    ...rest,
    ...(severity ? { severity } : {}),
    ...(data_json ? { data: parseDataJson(data_json) } : {}),
  }));
}

export function parseDataJson(json: string): AlertEpisodeData {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const result: AlertEpisodeData = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        set(result, key.split('.'), value);
      }
    }
    return result;
  } catch {
    return {};
  }
}
