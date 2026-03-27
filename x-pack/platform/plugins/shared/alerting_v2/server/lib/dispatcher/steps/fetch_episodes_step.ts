/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { inject, injectable } from 'inversify';
import type {
  AlertEpisode,
  DispatcherStep,
  DispatcherPipelineState,
  DispatcherStepOutput,
} from '../types';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { QueryServiceInternalToken } from '../../services/query_service/tokens';
import { queryResponseToRecords } from '../../services/query_service/query_response_to_records';
import { LOOKBACK_WINDOW_MINUTES } from '../constants';
import { getDispatchableAlertEventsQuery } from '../queries';

@injectable()
export class FetchEpisodesStep implements DispatcherStep {
  public readonly name = 'fetch_episodes';

  constructor(
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract
  ) {}

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { previousStartedAt } = state.input;

    const lookback = moment(previousStartedAt)
      .subtract(LOOKBACK_WINDOW_MINUTES, 'minutes')
      .toISOString();

    const result = await this.queryService.executeQuery({
      query: getDispatchableAlertEventsQuery().query,
      filter: {
        range: {
          '@timestamp': {
            gte: lookback,
          },
        },
      },
    });

    const episodes = queryResponseToRecords<AlertEpisode>(result);

    if (episodes.length === 0) {
      return { type: 'halt', reason: 'no_episodes' };
    }

    return { type: 'continue', data: { episodes } };
  }
}
