/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import {
  ALERT_EPISODE_ACTION_TYPE,
  ALERT_EPISODE_STATUS,
  type BulkCreateAlertActionBody,
} from '@kbn/alerting-v2-schemas';
import type { EpisodeAction, EpisodeActionContext } from './types';
import { bulkCreateAlertActions } from './bulk_create_alert_actions';
import { uniqueByGroup, successOrPartialToast } from './helpers';
import { episodeSupportsActions } from '../queries/episodes_query';
import * as i18n from './translations';

export interface UnresolveActionDeps {
  http: HttpStart;
  notifications: NotificationsStart;
}

export const createUnresolveAction = (deps: UnresolveActionDeps): EpisodeAction => ({
  id: 'ALERTING_V2_UNRESOLVE_EPISODE',
  order: 31,
  displayName: i18n.UNRESOLVE,
  iconType: 'cross',
  isCompatible: ({ episodes }: EpisodeActionContext) => {
    const nativeEpisodes = episodes.filter(episodeSupportsActions);
    return (
      nativeEpisodes.length > 0 &&
      nativeEpisodes.some((ep) => ep['episode.status'] === ALERT_EPISODE_STATUS.INACTIVE)
    );
  },
  execute: async ({ episodes, onSuccess }: EpisodeActionContext) => {
    const actionable = episodes.filter(episodeSupportsActions);
    const items: BulkCreateAlertActionBody = uniqueByGroup(actionable).map((ep) => ({
      group_hash: ep.group_hash,
      action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
      reason: i18n.RESOLVE_ACTION_REASON,
    }));
    if (!items.length) return;

    try {
      const response = await bulkCreateAlertActions(deps.http, items);
      deps.notifications.toasts.add(successOrPartialToast(response));
      onSuccess?.();
    } catch {
      deps.notifications.toasts.addDanger(i18n.BULK_ERROR_TOAST);
    }
  },
  showWhenDisabled: ({ episodes }: EpisodeActionContext) =>
    episodes.some((ep) => ep['episode.status'] === ALERT_EPISODE_STATUS.INACTIVE),
  disabledTooltip: i18n.UNRESOLVE_NOT_AVAILABLE,
});
