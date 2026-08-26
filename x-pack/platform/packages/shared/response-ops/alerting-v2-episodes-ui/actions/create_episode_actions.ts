/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { QueryClient } from '@kbn/react-query';
import type { EpisodeAction } from './types';
import { createAckAction } from './ack';
import { createUnackAction } from './unack';
import { createSnoozeAction } from './snooze';
import { createUnsnoozeAction } from './unsnooze';
import { createResolveAction } from './resolve';
import { createUnresolveAction } from './unresolve';
import { createEditTagsAction } from './edit_tags';
import { createEditAssigneeAction } from './edit_assignee';
import { createOpenInDiscoverAction, OPEN_IN_DISCOVER_EPISODE_ACTION_ID } from './open_in_discover';

/**
 * Ids of episode actions that are safe to expose to users without write
 * privilege because they do not mutate any episode (e.g. navigation only).
 * Anything not listed here is treated as a write action and hidden from
 * read-only users, so new mutating actions are gated by default.
 */
export const READ_SAFE_EPISODE_ACTION_IDS: ReadonlySet<string> = new Set([
  OPEN_IN_DISCOVER_EPISODE_ACTION_ID,
]);

export interface EpisodeActionsDeps {
  http: HttpStart;
  overlays: OverlayStart;
  notifications: NotificationsStart;
  rendering: CoreStart['rendering'];
  application: ApplicationStart;
  userProfile: UserProfileService;
  docLinks: DocLinksStart;
  expressions: ExpressionsStart;
  spaces: SpacesPluginStart;
  queryClient: QueryClient;
  /** Resolver for "Open in Discover" URL; may be sync or async. Return undefined when not applicable. */
  getDiscoverHref: (args: {
    episodeIsoTimestamp: string;
    ruleId: string;
  }) => string | undefined | Promise<string | undefined>;
}

export const createEpisodeActions = (deps: EpisodeActionsDeps): EpisodeAction[] =>
  [
    createAckAction(deps),
    createUnackAction(deps),
    createSnoozeAction(deps),
    createUnsnoozeAction(deps),
    createResolveAction(deps),
    createUnresolveAction(deps),
    createEditTagsAction(deps),
    createEditAssigneeAction(deps),
    createOpenInDiscoverAction(deps),
  ].sort((a, b) => a.order - b.order);
