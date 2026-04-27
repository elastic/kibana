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
}

/**
 * `fetch_episodes` queries a strictly bounded `@timestamp` window so the
 * upstream rows fed into `INLINE STATS` (and the IN-list flowing into
 * `fetch_suppressions`) stay small enough to never breach ES|QL sub-plan
 * buffer or request-size limits — even at peak ingest.
 *
 * Window semantics:
 *   - `windowStart`:
 *     - subsequent runs: the persisted `eventWatermark` (exclusive lower bound).
 *     - cold start (no watermark): `now − LOOKBACK_WINDOW_MINUTES` (inclusive).
 *   - `windowEnd`: `min(windowStart + TICK_LOOKBACK_CAP_MINUTES, now − SETTLE_BUFFER_SECONDS)`.
 *     The settle buffer absorbs Elasticsearch refresh-interval lag and modest
 *     clock skew between the rule executor and the dispatcher.
 *   - Lower bound is `gte` only on cold start; subsequent ticks use `gt` to
 *     avoid re-processing the boundary event the previous tick already covered.
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
    const isFirstRun = !eventWatermark;

    const windowStart = isFirstRun
      ? moment().subtract(LOOKBACK_WINDOW_MINUTES, 'minutes')
      : moment(eventWatermark);

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
            ...(isFirstRun ? { gte: lowerBound } : { gt: lowerBound }),
            lte: upperBound,
          },
        },
      },
    });

    const episodes = parseAlertEpisodes(result);
    const nextEventWatermark = upperBound;

    if (episodes.length === 0) {
      return { type: 'halt', reason: 'no_episodes', data: { nextEventWatermark } };
    }

    return { type: 'continue', data: { episodes, nextEventWatermark } };
  }
}

export function parseAlertEpisodes(raw: RawAlertEpisode[]): AlertEpisode[] {
  return raw.map(({ data_json, ...rest }) => ({
    ...rest,
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
