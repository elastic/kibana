/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { ALERT_EPISODE_STATUS, type BulkActivateEpisodeActionItem } from '@kbn/alerting-v2-schemas';
import type { EpisodeAction, EpisodeActionContext } from './types';
import { bulkActivateEpisodeActions } from './bulk_create_alert_actions';
import { executeCompositeAction } from './execute_composite_action';
import { episodeSupportsActions, type AlertEpisode } from '../queries/episodes_query';
import * as i18n from './translations';

export interface UnresolveActionDeps {
  http: HttpStart;
  notifications: NotificationsStart;
}

const isResolved = (ep: AlertEpisode): boolean =>
  ep['episode.status'] === ALERT_EPISODE_STATUS.INACTIVE;

const canUnresolve = (ep: AlertEpisode): boolean => episodeSupportsActions(ep) && isResolved(ep);

export const createUnresolveAction = (deps: UnresolveActionDeps): EpisodeAction => ({
  id: 'ALERTING_V2_UNRESOLVE_EPISODE',
  order: 31,
  displayName: i18n.UNRESOLVE,
  iconType: 'cross',
  isCompatible: ({ episodes }: EpisodeActionContext) => episodes.some(canUnresolve),
  execute: async ({ episodes, onSuccess }: EpisodeActionContext) => {
    const actionable = episodes.filter(canUnresolve);
    const items: BulkActivateEpisodeActionItem[] = actionable.map((ep) => ({
      alert_id: ep['episode.id'],
      reason: i18n.RESOLVE_ACTION_REASON,
    }));
    if (!items.length) return;

    await executeCompositeAction({
      episodes: actionable,
      nativeExecute: (_episodes, http) => bulkActivateEpisodeActions(http, items),
      actionName: i18n.UNRESOLVE,
      onSuccess,
      deps,
    });
  },
  showWhenDisabled: ({ episodes }: EpisodeActionContext) => episodes.some(isResolved),
  getBulkDisabledReason: (episodes) =>
    episodes.some((ep) => isResolved(ep) && !canUnresolve(ep))
      ? i18n.UNRESOLVE_NOT_AVAILABLE
      : undefined,
  disabledTooltip: i18n.UNRESOLVE_NOT_AVAILABLE,
});
