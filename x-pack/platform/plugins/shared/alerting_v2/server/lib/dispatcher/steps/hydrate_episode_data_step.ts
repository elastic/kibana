/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type {
  AlertEpisode,
  DispatcherStep,
  DispatcherPipelineState,
  DispatcherStepOutput,
} from '../types';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { QueryServiceInternalToken } from '../../services/query_service/tokens';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { getEpisodeDataQueries } from '../queries';
import { parseDataJson } from './utils/parse_episode_data';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';

interface RawEpisodeData {
  episode_id: string;
  data_json: string | null;
}

@injectable()
export class HydrateEpisodeDataStep implements DispatcherStep {
  public readonly name = 'hydrate_episode_data';

  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract
  ) {
    this.logger = loggerService.forSubsystem('dispatcher');
  }

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { dispatchable = [] } = state;

    if (dispatchable.length === 0) {
      return { type: 'continue' };
    }

    const episodeIds = [...new Set(dispatchable.map((ep) => ep.episode_id))];

    const { gte, lte } = computeTimestampBounds(dispatchable);

    const responses = await Promise.all(
      getEpisodeDataQueries(episodeIds, { gte, lte }).map((request) =>
        this.queryService.executeQueryRows<RawEpisodeData>({ query: request.query })
      )
    );

    const dataByEpisodeId = new Map<string, string | null>();
    for (const row of responses.flat()) {
      dataByEpisodeId.set(row.episode_id, row.data_json);
    }

    const hydrated = dataByEpisodeId.size;
    const requested = episodeIds.length;
    if (hydrated < requested) {
      this.logger.warn({
        code: ALERTING_LOG_CODES.HYDRATE_EPISODE_DATA_STEP_MISSING_RULE_EVENTS_ROW,
        message: 'Episodes missing matching rule-events row',
        labels: { step: this.name },
      });
    }

    const hydratedDispatchable: AlertEpisode[] = dispatchable.map((ep) => {
      const raw = dataByEpisodeId.get(ep.episode_id);
      if (raw == null) return ep;
      return { ...ep, data: parseDataJson(raw) };
    });

    return { type: 'continue', data: { dispatchable: hydratedDispatchable } };
  }
}

function computeTimestampBounds(episodes: readonly AlertEpisode[]): { gte: string; lte: string } {
  const epoch = new Date(0).toISOString();
  let gte: string | undefined;
  let lte: string | undefined;

  for (const ep of episodes) {
    const parsed = new Date(ep.last_event_timestamp);
    if (Number.isNaN(parsed.getTime())) continue;

    const ts = parsed.toISOString();
    if (gte === undefined || ts < gte) gte = ts;
    if (lte === undefined || ts > lte) lte = ts;
  }

  return { gte: gte ?? epoch, lte: lte ?? epoch };
}
