/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import type { EpisodeAction, EpisodeActionContext } from './types';
import { bulkCreateAlertActions } from './bulk_create_alert_actions';
import { successOrPartialToast } from './helpers';
import * as i18n from './translations';

export interface AckActionDeps {
  http: HttpStart;
  notifications: NotificationsStart;
}

export const createAckAction = (deps: AckActionDeps): EpisodeAction => ({
  id: 'ALERTING_V2_ACK_EPISODE',
  order: 10,
  displayName: i18n.ACK,
  iconType: 'info',
  isCompatible: ({ episodes }: EpisodeActionContext) =>
    episodes.length > 0 && episodes.some((ep) => ep.last_ack_action !== 'ack'),
  execute: async ({ episodes, onSuccess }: EpisodeActionContext) => {
    const items = episodes.map((ep) => ({
      group_hash: ep.group_hash,
      action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
      episode_id: ep['episode.id'],
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
