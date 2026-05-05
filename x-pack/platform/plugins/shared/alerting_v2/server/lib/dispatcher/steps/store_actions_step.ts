/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import {
  ALERT_ACTIONS_DATA_STREAM,
  type AlertAction,
} from '../../../resources/datastreams/alert_actions';
import type {
  AlertEpisode,
  ActionGroup,
  DispatcherStep,
  DispatcherPipelineState,
  DispatcherStepOutput,
} from '../types';
import type { StorageServiceContract } from '../../services/storage_service/storage_service';
import { StorageServiceInternalToken } from '../../services/storage_service/tokens';

@injectable()
export class StoreActionsStep implements DispatcherStep {
  public readonly name = 'record_actions';

  constructor(
    @inject(StorageServiceInternalToken) private readonly storageService: StorageServiceContract
  ) {}

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const {
      suppressed = [],
      throttled = [],
      dispatch = [],
      dispatchable = [],
      policies,
      rules,
    } = state;

    const unmatched = getUnmatchedEpisodes(dispatchable, dispatch, throttled);

    if (
      suppressed.length === 0 &&
      throttled.length === 0 &&
      dispatch.length === 0 &&
      unmatched.length === 0
    ) {
      return { type: 'halt', reason: 'no_actions' };
    }

    const now = new Date();
    const spaceIdForEpisode = (episode: AlertEpisode) =>
      rules?.get(episode.rule_id)?.spaceId ?? 'default';

    await this.storageService.bulkIndexDocs<AlertAction>({
      index: ALERT_ACTIONS_DATA_STREAM,
      docs: [
        ...suppressed.map((episode) =>
          toAction({
            episode,
            actionType: 'suppress',
            now,
            reason: episode.reason,
            spaceId: spaceIdForEpisode(episode),
          })
        ),
        ...throttled.flatMap((group) =>
          group.episodes.map((episode) =>
            toAction({
              episode,
              actionType: 'suppress',
              now,
              reason: `suppressed by throttled policy ${group.policyId}`,
              spaceId: spaceIdForEpisode(episode),
            })
          )
        ),
        ...dispatch.flatMap((group) =>
          group.episodes.map((episode) =>
            toAction({
              episode,
              actionType: 'fire',
              now,
              reason: `dispatched by policy ${group.policyId}`,
              spaceId: spaceIdForEpisode(episode),
            })
          )
        ),
        ...dispatch.map((group) => {
          const groupingMode = policies?.get(group.policyId)?.groupingMode ?? 'per_episode';
          const firstEpisode = group.episodes[0];
          const spaceId = firstEpisode ? spaceIdForEpisode(firstEpisode) : 'default';
          const action: AlertAction = {
            '@timestamp': now.toISOString(),
            actor: 'system',
            action_type: 'notified',
            rule_id: firstEpisode?.rule_id ?? 'unknown',
            group_hash: firstEpisode?.group_hash ?? 'unknown',
            last_series_event_timestamp: now.toISOString(),
            action_group_id: group.id,
            source: 'internal',
            reason: `notified by policy ${group.policyId}`,
            space_id: spaceId,
          };
          if (groupingMode === 'per_episode') {
            action.episode_status = firstEpisode?.episode_status;
          }
          return action;
        }),
        ...unmatched.map((episode) =>
          toAction({
            episode,
            actionType: 'unmatched',
            now,
            reason: 'no matching action policy',
            spaceId: spaceIdForEpisode(episode),
          })
        ),
      ],
    });

    return { type: 'continue' };
  }
}

function getUnmatchedEpisodes(
  dispatchable: readonly AlertEpisode[],
  dispatch: readonly ActionGroup[],
  throttled: readonly ActionGroup[]
): AlertEpisode[] {
  const handledEpisodeKeys = new Set<string>();
  for (const group of [...dispatch, ...throttled]) {
    for (const episode of group.episodes) {
      handledEpisodeKeys.add(`${episode.rule_id}:${episode.group_hash}:${episode.episode_id}`);
    }
  }

  return dispatchable.filter(
    (ep) => !handledEpisodeKeys.has(`${ep.rule_id}:${ep.group_hash}:${ep.episode_id}`)
  );
}

function toAction({
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
    source: 'internal',
    reason,
    space_id: spaceId,
  };
}
