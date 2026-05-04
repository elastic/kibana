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
import type { QueryClient } from '@kbn/react-query';
import type { EpisodeAction } from './types';
import { createViewDetailsAction } from './view_details';
import { createAckAction } from './ack';
import { createUnackAction } from './unack';
import { createSnoozeAction } from './snooze';
import { createUnsnoozeAction } from './unsnooze';
import { createResolveAction } from './resolve';
import { createUnresolveAction } from './unresolve';
import { createEditTagsAction } from './edit_tags';
import { createEditAssigneeAction } from './edit_assignee';
import { createOpenInDiscoverAction } from './open_in_discover';

export interface EpisodeActionsDeps {
  http: HttpStart;
  overlays: OverlayStart;
  notifications: NotificationsStart;
  rendering: CoreStart['rendering'];
  application: ApplicationStart;
  userProfile: UserProfileService;
  docLinks: DocLinksStart;
  expressions: ExpressionsStart;
  queryClient: QueryClient;
  /** Resolver for single-episode-page URL (caller prepends basePath). */
  getEpisodeDetailsHref: (episodeId: string) => string;
  /** Resolver for "Open in Discover" URL; may be sync or async. Return undefined when not applicable. */
  getDiscoverHref: (args: {
    episodeIsoTimestamp: string;
    ruleId: string;
  }) => string | undefined | Promise<string | undefined>;
}

export const createEpisodeActions = (deps: EpisodeActionsDeps): EpisodeAction[] =>
  [
    createViewDetailsAction(deps),
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
