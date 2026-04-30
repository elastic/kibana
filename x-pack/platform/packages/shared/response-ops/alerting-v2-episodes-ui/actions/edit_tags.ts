/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// currentTags starts as [] for bulk selection, matching BulkTagsModal which always starts empty
// (the user is replacing tags across multiple episodes, so no single "current" set exists).

import type { HttpStart } from '@kbn/core-http-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { QueryClient } from '@kbn/react-query';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import type { EpisodeAction, EpisodeActionContext } from './types';
import { bulkCreateAlertActions } from './bulk_create_alert_actions';
import { uniqueByGroup, successOrPartialToast } from './helpers';
import * as i18n from './translations';
import { openTagsFlyout } from '../components/tags_flyout';

export interface EditTagsActionDeps {
  http: HttpStart;
  overlays: OverlayStart;
  notifications: NotificationsStart;
  rendering: CoreStart['rendering'];
  expressions: ExpressionsStart;
  queryClient: QueryClient;
}

export const createEditTagsAction = (deps: EditTagsActionDeps): EpisodeAction => ({
  id: 'ALERTING_V2_EDIT_EPISODE_TAGS',
  order: 40,
  displayName: i18n.EDIT_TAGS,
  iconType: 'tag',
  isCompatible: ({ episodes }: EpisodeActionContext) => episodes.length > 0,
  execute: async ({ episodes, onSuccess }: EpisodeActionContext) => {
    const tags = await openTagsFlyout(deps.overlays, deps.rendering, [], {
      http: deps.http,
      expressions: deps.expressions,
      queryClient: deps.queryClient,
    });
    if (tags == null) return;

    const items = uniqueByGroup(episodes).map((ep) => ({
      group_hash: ep.group_hash,
      action_type: ALERT_EPISODE_ACTION_TYPE.TAG,
      tags,
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
