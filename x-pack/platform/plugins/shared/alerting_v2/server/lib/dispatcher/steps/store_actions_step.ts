/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import type { DispatcherStep, DispatcherPipelineState, DispatcherStepOutput } from '../types';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import type { StorageServiceContract } from '../../services/storage_service/storage_service';
import { StorageServiceInternalToken } from '../../services/storage_service/tokens';
import { getUnmatchedEpisodes } from './utils/unmatched_episodes';
import { toAction } from './utils/action_builders';

@injectable()
export class StoreActionsStep implements DispatcherStep {
  public readonly name = 'record_actions';

  constructor(
    @inject(StorageServiceInternalToken) private readonly storageService: StorageServiceContract
  ) {}

  public async execute(
    state: Readonly<DispatcherPipelineState>,
    _: LoggerServiceContract
  ): Promise<DispatcherStepOutput> {
    const {
      suppressed = [],
      throttled = [],
      dispatch = [],
      dispatchable = [],
      firedEpisodes = 0,
    } = state;

    const unmatched = getUnmatchedEpisodes(dispatchable, dispatch, throttled);

    if (
      suppressed.length === 0 &&
      throttled.length === 0 &&
      firedEpisodes === 0 &&
      unmatched.length === 0
    ) {
      return { type: 'halt', reason: 'no_actions' };
    }

    const now = new Date();

    const docs = [
      ...suppressed.map((episode) =>
        toAction({
          episode,
          actionType: 'suppress',
          now,
          reason: episode.reason,
          spaceId: episode.space_id,
        })
      ),
      ...throttled.flatMap((group) =>
        group.episodes.map((episode) =>
          toAction({
            episode,
            actionType: 'suppress',
            now,
            reason: `suppressed by throttled policy ${group.policyId}`,
            spaceId: episode.space_id,
          })
        )
      ),
      ...unmatched.map((episode) =>
        toAction({
          episode,
          actionType: 'unmatched',
          now,
          reason: 'no matching action policy',
          spaceId: episode.space_id,
        })
      ),
    ];

    if (docs.length > 0) {
      await this.storageService.bulkIndexDocs({
        index: ALERT_ACTIONS_DATA_STREAM,
        docs,
      });
    }

    const recordedEpisodes =
      firedEpisodes +
      suppressed.length +
      throttled.reduce((n, g) => n + g.episodes.length, 0) +
      unmatched.length;

    return { type: 'continue', data: { recordedEpisodes } };
  }
}
