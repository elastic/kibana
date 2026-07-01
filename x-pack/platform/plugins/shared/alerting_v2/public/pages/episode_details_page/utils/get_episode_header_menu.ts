/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderMenu } from '@kbn/app-header';
import type { EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';

export interface EpisodeHeaderMenuArgs {
  actions: EpisodeAction[];
  episode: AlertEpisode | undefined;
  onSuccess: () => void;
}

const SECONDARY_ACTION_IDS = new Set([
  'ALERTING_V2_EDIT_EPISODE_TAGS',
  'ALERTING_V2_EDIT_EPISODE_ASSIGNEE',
  'ALERTING_V2_OPEN_EPISODE_IN_DISCOVER',
]);

export const getEpisodeHeaderMenu = ({
  actions,
  episode,
  onSuccess,
}: EpisodeHeaderMenuArgs): AppHeaderMenu => {
  let isFirstSecondary = true;

  return {
    items: actions.map((action) => {
      const isSecondary = SECONDARY_ACTION_IDS.has(action.id);
      // Divide the primary actions from the secondary group with a single separator above the
      // first secondary item in the overflow popover.
      const separator = isSecondary && isFirstSecondary ? ('above' as const) : undefined;
      if (isSecondary) {
        isFirstSecondary = false;
      }

      return {
        id: action.id,
        label: action.displayName,
        iconType: action.iconType,
        run: () =>
          action.execute({
            episodes: episode ? [episode] : [],
            onSuccess,
          }),
        testId: isSecondary
          ? `episodeActionsBar-overflow-${action.id}`
          : `episodeActionsBar-primary-${action.id}`,
        order: action.order,
        overflow: isSecondary,
        ...(separator ? { separator } : {}),
      };
    }),
  };
};
