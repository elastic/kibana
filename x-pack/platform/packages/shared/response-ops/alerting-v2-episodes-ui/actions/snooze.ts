/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import {
  ALERT_EPISODE_ACTION_TYPE,
  type BulkCreateAlertActionBody,
} from '@kbn/alerting-v2-schemas';
import type { EpisodeActionExtension } from '../types/episode_data_source';
import type { EpisodeAction, EpisodeActionContext } from './types';
import { bulkCreateAlertActions } from './bulk_create_alert_actions';
import { uniqueByGroup } from './helpers';
import { isEpisodeSnoozed } from '../utils/is_episode_snoozed';
import { executeCompositeAction } from './execute_composite_action';
import * as i18n from './translations';
import { openSnoozeExpiryModal } from '../components/snooze_expiry_modal';

export interface SnoozeActionDeps {
  http: HttpStart;
  overlays: OverlayStart;
  notifications: NotificationsStart;
  rendering: CoreStart['rendering'];
}

export const createSnoozeAction = (
  deps: SnoozeActionDeps,
  extension?: EpisodeActionExtension<{ expiry: string | null }>
): EpisodeAction => ({
  id: 'ALERTING_V2_SNOOZE_EPISODE',
  order: 20,
  displayName: i18n.SNOOZE,
  iconType: 'bellSlash',
  isCompatible: ({ episodes }: EpisodeActionContext) =>
    episodes.some((ep) =>
      ep.source_id == null
        ? !isEpisodeSnoozed(ep.last_snooze_action, ep.snooze_expiry)
        : extension?.isCompatible(ep) ?? false
    ),
  execute: async ({ episodes, onSuccess }: EpisodeActionContext) => {
    const expiry = await openSnoozeExpiryModal(deps.overlays, deps.rendering);
    if (expiry === undefined) return;

    try {
      await executeCompositeAction<{ expiry: string | null }>({
        episodes,
        nativeExecute: (eps, http) =>
          bulkCreateAlertActions(
            http,
            uniqueByGroup(eps).map((ep): BulkCreateAlertActionBody[number] => ({
              group_hash: ep.group_hash,
              action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
              ...(expiry === null ? {} : { expiry }),
            }))
          ),
        extension,
        extensionContext: { expiry },
        deps,
      });
      onSuccess?.();
    } catch {
      deps.notifications.toasts.addDanger(i18n.BULK_ERROR_TOAST);
    }
  },
});
