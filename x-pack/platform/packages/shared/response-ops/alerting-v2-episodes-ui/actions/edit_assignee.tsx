/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { QueryClient } from '@kbn/react-query';
import type { BulkAssignEpisodeActionItem } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '../queries/episodes_query';
import { episodeSupportsActions } from '../queries/episodes_query';
import type {
  EpisodeAction,
  EpisodeActionContext,
  EpisodeActionInlineControlContext,
  EpisodeActionMenuItemContext,
} from './types';
import { bulkAssignEpisodeActions } from './bulk_create_alert_actions';
import { executeCompositeAction } from './execute_composite_action';
import * as i18n from './translations';
import { openAssigneeModal } from '../components/assignee_modal';
import { EditEpisodeAssigneePopoverItem } from '../components/actions/edit_episode_assignee_popover_item';
import { EpisodeAssigneeInlineControl } from '../components/actions/episode_assignee_inline_control';

export const EDIT_EPISODE_ASSIGNEE_ACTION_ID = 'ALERTING_V2_EDIT_EPISODE_ASSIGNEE';

export interface EditAssigneeActionDeps {
  http: HttpStart;
  overlays: OverlayStart;
  notifications: NotificationsStart;
  rendering: CoreStart['rendering'];
  userProfile: UserProfileService;
  docLinks: DocLinksStart;
  queryClient: QueryClient;
}

/**
 * For a single-episode invocation, pre-populate the picker with the episode's
 * current assignee. For bulk, leave it blank — there's no shared "current"
 * value across the selection.
 */
const getCurrentAssigneeUid = (episodes: AlertEpisode[]): string | null =>
  episodes.length === 1 ? episodes[0].last_assignee_uid ?? null : null;

const applyAssignee = async (
  deps: EditAssigneeActionDeps,
  { episodes, onSuccess }: EpisodeActionContext,
  assigneeUid: string | null
) => {
  const actionable = episodes.filter(episodeSupportsActions);
  const items: BulkAssignEpisodeActionItem[] = actionable.map((episode) => ({
    alert_id: episode['episode.id'],
    assignee_uid: assigneeUid,
  }));
  if (!items.length) return;

  await executeCompositeAction({
    episodes: actionable,
    nativeExecute: (_episodes, http) => bulkAssignEpisodeActions(http, items),
    actionName: i18n.EDIT_ASSIGNEE,
    onSuccess,
    deps,
  });
};

export const createEditAssigneeAction = (deps: EditAssigneeActionDeps): EpisodeAction => ({
  id: EDIT_EPISODE_ASSIGNEE_ACTION_ID,
  order: 50,
  displayName: i18n.EDIT_ASSIGNEE,
  iconType: 'user',
  isCompatible: ({ episodes }: EpisodeActionContext) => episodes.some(episodeSupportsActions),
  getBulkDisabledReason: (episodes) =>
    episodes.every(episodeSupportsActions) ? undefined : i18n.EDIT_ASSIGNEE_NOT_AVAILABLE,
  // Keyboard navigation is broken inside the context menu. The nested popover portals out of the
  // menu's DOM, but its key events still bubble through the React tree to EuiContextMenu, which
  // takes the arrow keys. Arrow keys in the user search field or user list move focus through the
  // menu, or back a panel.
  renderMenuItem: ({ episodes, onSuccess, closeMenu }: EpisodeActionMenuItemContext) => (
    <EditEpisodeAssigneePopoverItem
      assigneeUid={getCurrentAssigneeUid(episodes)}
      episodeCount={episodes.length}
      label={i18n.EDIT_ASSIGNEE}
      iconType="user"
      closeMenu={closeMenu}
      onApply={(uid) => applyAssignee(deps, { episodes, onSuccess }, uid)}
    />
  ),
  renderInlineControl: ({ episodes, onSuccess, isDisabled }: EpisodeActionInlineControlContext) => (
    <EpisodeAssigneeInlineControl
      assigneeUid={getCurrentAssigneeUid(episodes)}
      userProfile={deps.userProfile}
      episodeCount={episodes.length}
      isDisabled={isDisabled || episodes.length === 0}
      onApply={(uid) => applyAssignee(deps, { episodes, onSuccess }, uid)}
    />
  ),
  execute: async (ctx: EpisodeActionContext) => {
    const result = await openAssigneeModal(
      deps.overlays,
      deps.rendering,
      {
        queryClient: deps.queryClient,
        kibanaServices: {
          notifications: deps.notifications,
          userProfile: deps.userProfile,
          docLinks: deps.docLinks,
        },
      },
      { assigneeUid: getCurrentAssigneeUid(ctx.episodes), episodeCount: ctx.episodes.length }
    );
    // `undefined` means dismissed; `null` means "clear assignee".
    if (result === undefined) return;

    await applyAssignee(deps, ctx, result);
  },
});
