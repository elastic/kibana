/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { ALERT_EPISODE_ACTION_TYPE, ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { EpisodeAction, EpisodeActionContext } from './types';
import { bulkCreateAlertActions } from './bulk_create_alert_actions';
import { uniqueByGroup, successOrPartialToast } from './helpers';
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
  isCompatible: ({ episodes }: EpisodeActionContext) =>
    episodes.length > 0 &&
    episodes.some(
      (ep) =>
        ep.last_deactivate_action !== 'activate' &&
        ep['episode.status'] !== ALERT_EPISODE_STATUS.ACTIVE
    ),
  execute: async ({ episodes, onSuccess }: EpisodeActionContext) => {
    const items = uniqueByGroup(episodes).map((ep) => ({
      group_hash: ep.group_hash,
      action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
      reason: i18n.RESOLVE_ACTION_REASON,
    }));
    if (!items.length) return;

    try {
      const { processed, total } = await bulkCreateAlertActions(deps.http, items as any);
      deps.notifications.toasts.add(successOrPartialToast(processed, total));
      onSuccess?.();
    } catch {
      deps.notifications.toasts.addDanger(i18n.BULK_ERROR_TOAST);
    }
  },
});
