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
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { QueryClient } from '@kbn/react-query';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import type { EpisodeAction, EpisodeActionContext } from './types';
import { bulkCreateAlertActions } from './bulk_create_alert_actions';
import { successOrPartialToast } from './helpers';
import * as i18n from './translations';
import { openAssigneeFlyout } from '../components/assignee_flyout';

export interface EditAssigneeActionDeps {
  http: HttpStart;
  overlays: OverlayStart;
  notifications: NotificationsStart;
  rendering: CoreStart['rendering'];
  userProfile: UserProfileService;
  docLinks: DocLinksStart;
  queryClient: QueryClient;
}

export const createEditAssigneeAction = (deps: EditAssigneeActionDeps): EpisodeAction => ({
  id: 'ALERTING_V2_EDIT_EPISODE_ASSIGNEE',
  order: 50,
  displayName: i18n.EDIT_ASSIGNEE,
  iconType: 'user',
  isCompatible: ({ episodes }: EpisodeActionContext) => episodes.length > 0,
  execute: async ({ episodes, onSuccess }: EpisodeActionContext) => {
    // For a single-row invocation, pre-populate the picker with the episode's
    // current assignee. For bulk (>1), leave it blank — there's no shared
    // "current" value across the selection.
    const lastAssigneeUid = episodes.length === 1 ? episodes[0].last_assignee_uid ?? null : null;
    const result = await openAssigneeFlyout(
      deps.overlays,
      deps.rendering,
      {
        queryClient: deps.queryClient,
        kibanaServices: {
          http: deps.http,
          notifications: deps.notifications,
          userProfile: deps.userProfile,
          docLinks: deps.docLinks,
        },
      },
      { lastAssigneeUid, episodeCount: episodes.length }
    );
    // `undefined` means cancelled; `null` means "clear assignee".
    if (result === undefined) return;

    const items = episodes.map((ep) => ({
      group_hash: ep.group_hash,
      action_type: ALERT_EPISODE_ACTION_TYPE.ASSIGN,
      episode_id: ep['episode.id'],
      assignee_uid: result,
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
