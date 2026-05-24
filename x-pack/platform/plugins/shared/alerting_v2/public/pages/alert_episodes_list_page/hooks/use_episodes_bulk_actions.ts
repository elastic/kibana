/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { CustomBulkActions } from '@kbn/unified-data-table';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions';
import { getEpisodesFromDocIds } from '@kbn/alerting-v2-episodes-ui/utils/bulk_selection';

interface UseEpisodesBulkActionsParams {
  actions: EpisodeAction[];
  episodesData: AlertEpisode[] | undefined;
  onSuccess: () => void;
}

export const useEpisodesBulkActions = ({
  actions,
  episodesData,
  onSuccess,
}: UseEpisodesBulkActionsParams): CustomBulkActions =>
  useMemo(
    () =>
      actions.map((action) => ({
        key: action.id,
        label: action.displayName,
        icon: action.iconType,
        isAvailable: ({ selectedDocIds }) =>
          action.isCompatible({
            episodes: getEpisodesFromDocIds(selectedDocIds, episodesData ?? []),
          }),
        onClick: ({ selectedDocIds }) =>
          action.execute({
            episodes: getEpisodesFromDocIds(selectedDocIds, episodesData ?? []),
            onSuccess,
          }),
      })),
    [actions, episodesData, onSuccess]
  );
