/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// For a single episode, seed the flyout from `last_tags`. For multiple selections, start empty
// (no single "current" set when replacing tags across episodes).

import type { HttpStart } from '@kbn/core-http-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { QueryClient } from '@kbn/react-query';
import type { BulkTagEpisodeActionItem } from '@kbn/alerting-v2-schemas';
import type { EpisodeActionExtension } from '../types/episode_data_source';
import type { EpisodeAction, EpisodeActionContext } from './types';
import { bulkTagEpisodeActions } from './bulk_create_alert_actions';
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
  /** Extra tag options always offered in the flyout (e.g. a consumer's preset tag vocabulary). */
  presetTags?: string[];
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
    const currentTags = episodes.length === 1 ? episodes[0].last_tags ?? [] : [];
    const tags = await openTagsFlyout(deps.overlays, deps.rendering, currentTags, {
      expressions: deps.expressions,
      spaces: deps.spaces,
      queryClient: deps.queryClient,
      fetchAdditionalSuggestions: deps.fetchAdditionalTagSuggestions,
      presetTags: deps.presetTags,
    });
    if (tags == null) return;

    try {
      await executeCompositeAction<{ tags: string[] }>({
        episodes,
        nativeExecute: (eps, http) =>
          bulkTagEpisodeActions(
            http,
            eps.map(
              (ep): BulkTagEpisodeActionItem => ({
                episode_id: ep['episode.id'],
                tags,
              })
            )
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
