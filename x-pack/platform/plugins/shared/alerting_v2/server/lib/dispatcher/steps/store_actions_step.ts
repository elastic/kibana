/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import type { AlertAction } from '../../../resources/datastreams/alert_actions';
import type {
  AlertEpisode,
  DispatcherStep,
  DispatcherPipelineState,
  DispatcherStepOutput,
} from '../types';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import type { StorageServiceContract } from '../../services/storage_service/storage_service';
import { StorageServiceInternalToken } from '../../services/storage_service/tokens';
import { DispatchPlan, EpisodeTriage, PolicyCatalog } from '../state';

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
      triage = EpisodeTriage.empty(),
      plan = DispatchPlan.empty(),
      policies = PolicyCatalog.empty(),
    } = state;
    const { suppressed } = triage;
    const { toDispatch, throttled, unmatched } = plan;

    if (suppressed.length === 0 && plan.isEmpty() && unmatched.length === 0) {
      return { type: 'halt', reason: 'no_actions' };
    }

    const now = new Date();

    // One doc per episode-scoped outcome; their count gates watermark advancement.
    const episodeActions: AlertAction[] = [
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
      ...toDispatch.flatMap((group) =>
        group.episodes.map((episode) =>
          toAction({
            episode,
            actionType: 'fire',
            now,
            reason: `dispatched by policy ${group.policyId}`,
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

    // One `notified` doc per dispatched group — group-scoped, so excluded from
    // the recordedEpisodes tally.
    const notifiedActions: AlertAction[] = toDispatch.map((group) => {
      const groupingMode = policies.groupingModeOf(group.policyId);
      const firstEpisode = group.episodes[0];
      const spaceId = firstEpisode?.space_id ?? 'default';
      const action: AlertAction = {
        '@timestamp': now.toISOString(),
        actor: 'system',
        action_type: 'notified',
        rule_id: firstEpisode?.rule_id ?? null,
        group_hash: firstEpisode?.group_hash ?? 'unknown',
        last_series_event_timestamp: now.toISOString(),
        action_group_id: group.id,
        source: firstEpisode?.source,
        reason: `notified by policy ${group.policyId}`,
        space_id: spaceId,
      };
      if (groupingMode === 'per_episode') {
        action.episode_status = firstEpisode?.episode_status;
      }
      return action;
    });

    await this.storageService.bulkIndexDocs<AlertAction>({
      index: ALERT_ACTIONS_DATA_STREAM,
      docs: [...episodeActions, ...notifiedActions],
    });

    return { type: 'continue', data: { recordedEpisodes: episodeActions.length } };
  }
}

export function toAction({
  episode,
  actionType,
  now,
  reason,
  spaceId,
}: {
  episode: AlertEpisode;
  actionType: 'suppress' | 'fire' | 'notified' | 'unmatched';
  now: Date;
  reason?: string;
  spaceId: string;
}): AlertAction {
  return {
    '@timestamp': now.toISOString(),
    group_hash: episode.group_hash,
    last_series_event_timestamp: episode.last_event_timestamp,
    actor: 'system',
    action_type: actionType,
    rule_id: episode.rule_id,
    source: episode.source,
    reason,
    space_id: spaceId,
  };
}
