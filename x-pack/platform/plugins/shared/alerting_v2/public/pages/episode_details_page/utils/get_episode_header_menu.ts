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
  'ALERTING_V2_RESOLVE_EPISODE',
  'ALERTING_V2_UNRESOLVE_EPISODE',
  'ALERTING_V2_EDIT_EPISODE_TAGS',
  'ALERTING_V2_EDIT_EPISODE_ASSIGNEE',
]);

// Rendered as the app menu's dedicated primaryActionItem, which always sits to the far right of
// the header (after the overflow trigger) instead of among the ordered items.
const PRIMARY_ACTION_ITEM_ID = 'ALERTING_V2_OPEN_EPISODE_IN_DISCOVER';

export const getEpisodeHeaderMenu = ({
  actions,
  episode,
  onSuccess,
}: EpisodeHeaderMenuArgs): AppHeaderMenu => {
  const runAction = (action: EpisodeAction) => () =>
    action.execute({
      episodes: episode ? [episode] : [],
      onSuccess,
    });

  const primaryAction = actions.find((action) => action.id === PRIMARY_ACTION_ITEM_ID);

  return {
    items: actions
      .filter((action) => action.id !== PRIMARY_ACTION_ITEM_ID)
      .map((action) => {
        const isSecondary = SECONDARY_ACTION_IDS.has(action.id);

        return {
          id: action.id,
          label: action.displayName,
          iconType: action.iconType,
          run: runAction(action),
          testId: isSecondary
            ? `episodeActionsBar-overflow-${action.id}`
            : `episodeActionsBar-primary-${action.id}`,
          order: action.order,
          overflow: isSecondary,
        };
      }),
    ...(primaryAction
      ? {
          primaryActionItem: {
            id: primaryAction.id,
            label: primaryAction.displayName,
            iconType: primaryAction.iconType,
            run: runAction(primaryAction),
            testId: `episodeActionsBar-primaryAction-${primaryAction.id}`,
          },
        }
      : {}),
  };
};
