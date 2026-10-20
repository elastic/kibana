/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { episodeSupportsTimeline } from '../queries/episodes_query';
import type { EpisodeAction } from './types';
import * as i18n from './translations';

export const OPEN_ALERT_EVENTS_HISTORY_ACTION_ID =
  'ALERTING_V2_OPEN_ALERT_EVENTS_HISTORY_IN_DISCOVER';

export interface OpenAlertEventsHistoryActionDeps {
  spaces: SpacesPluginStart;
  /**
   * Whether Discover can open this episode's rule-events history. False when
   * Discover access or ES|QL is unavailable, so the menu item is not offered.
   */
  isAvailable: () => boolean;
  getAlertEventsHistoryHref: (args: {
    episodeId: string;
    episodeStart: string;
    spaceId: string;
  }) => string | undefined | Promise<string | undefined>;
}

export const createOpenAlertEventsHistoryAction = (
  deps: OpenAlertEventsHistoryActionDeps
): EpisodeAction => ({
  id: OPEN_ALERT_EVENTS_HISTORY_ACTION_ID,
  order: 51,
  displayName: i18n.OPEN_ALERT_EVENTS_HISTORY,
  iconType: 'productDiscover',
  enforcesOwnPrivileges: true,
  isCompatible: ({ episodes }) =>
    episodes.length === 1 && episodeSupportsTimeline(episodes[0]) && deps.isAvailable(),
  execute: async ({ episodes }) => {
    const [episode] = episodes;
    const { id: spaceId } = await deps.spaces.getActiveSpace();
    const href = await deps.getAlertEventsHistoryHref({
      episodeId: episode['episode.id'],
      episodeStart: episode.first_timestamp,
      spaceId,
    });
    if (!href) return;
    window.open(href, '_blank', 'noopener,noreferrer');
  },
});
