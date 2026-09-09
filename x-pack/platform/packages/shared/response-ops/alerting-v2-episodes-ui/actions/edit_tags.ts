/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// For a single episode, seed the flyout from `last_tags`. For multiple selections, seed with the
// union of all selected episodes' tags so users can see everything that's already applied.

import type { HttpStart } from '@kbn/core-http-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { QueryClient } from '@kbn/react-query';
import {
  ALERT_EPISODE_ACTION_TYPE,
  type BulkCreateAlertActionBody,
} from '@kbn/alerting-v2-schemas';
import type { EpisodeActionExtension } from '../types/episode_data_source';
import type { EpisodeAction, EpisodeActionContext } from './types';
import { bulkCreateAlertActions } from './bulk_create_alert_actions';
import { uniqueByGroup } from './helpers';
import { executeCompositeAction } from './execute_composite_action';
import * as i18n from './translations';
import { openTagsFlyout } from '../components/tags_flyout';

export interface EditTagsActionDeps {
  http: HttpStart;
  overlays: OverlayStart;
  notifications: NotificationsStart;
  rendering: CoreStart['rendering'];
  expressions: ExpressionsStart;
  spaces: SpacesPluginStart;
  queryClient: QueryClient;
  fetchAdditionalTagSuggestions?: () => Promise<string[]>;
}

export const EDIT_TAGS_ACTION_ID = 'ALERTING_V2_EDIT_EPISODE_TAGS';

export const createEditTagsAction = (
  deps: EditTagsActionDeps,
  extension?: EpisodeActionExtension<{ tags: string[] }>
): EpisodeAction => ({
  id: EDIT_TAGS_ACTION_ID,
  order: 40,
  displayName: i18n.EDIT_TAGS,
  iconType: 'tag',
  isCompatible: ({ episodes }: EpisodeActionContext) =>
    episodes.some((ep) => (ep.source_id == null ? true : extension?.isCompatible(ep) ?? false)),
  execute: async ({ episodes, onSuccess }: EpisodeActionContext) => {
    const currentTags =
      episodes.length === 1
        ? episodes[0].last_tags ?? []
        : [...new Set(episodes.flatMap((ep) => ep.last_tags ?? []))];
    const additionalSuggestions = await deps.fetchAdditionalTagSuggestions?.().catch(() => []);
    const tags = await openTagsFlyout(deps.overlays, deps.rendering, currentTags, {
      expressions: deps.expressions,
      spaces: deps.spaces,
      queryClient: deps.queryClient,
      additionalSuggestions,
    });
    if (tags == null) return;

    try {
      await executeCompositeAction<{ tags: string[] }>({
        episodes,
        nativeExecute: (eps, http) =>
          bulkCreateAlertActions(
            http,
            uniqueByGroup(eps).map((ep): BulkCreateAlertActionBody[number] => ({
              group_hash: ep.group_hash,
              action_type: ALERT_EPISODE_ACTION_TYPE.TAG,
              tags,
            }))
          ),
        extension,
        extensionContext: { tags },
        deps,
      });
      onSuccess?.();
    } catch {
      deps.notifications.toasts.addDanger(i18n.BULK_ERROR_TOAST);
    }
  },
});
