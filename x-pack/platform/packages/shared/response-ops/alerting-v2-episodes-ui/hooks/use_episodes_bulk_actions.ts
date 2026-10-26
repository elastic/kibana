/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { CustomBulkActions } from '@kbn/unified-data-table';
import type { AlertEpisode } from '../queries/episodes_query';
import type { EpisodeAction } from '../actions';
import { getEpisodesFromDocIds } from '../utils/bulk_selection';

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
  useMemo(() => {
    const allEpisodes = episodesData ?? [];
    const resolveSelection = (selectedDocIds: string[]) =>
      getEpisodesFromDocIds(selectedDocIds, allEpisodes);

    return actions
      .filter((action) => action.supportsBulk !== false)
      .map((action) => {
        const resolveDisabledReason = (selectedDocIds: string[]) =>
          action.getBulkDisabledReason?.(resolveSelection(selectedDocIds));

        return {
          key: action.id,
          'data-test-subj': `episodesBulkAction-${action.id}`,
          label: action.displayName,
          icon: action.iconType,
          isAvailable: ({ selectedDocIds }) =>
            resolveDisabledReason(selectedDocIds) !== undefined ||
            action.isCompatible({ episodes: resolveSelection(selectedDocIds) }),
          getDisabledReason: ({ selectedDocIds }) => resolveDisabledReason(selectedDocIds),
          onClick: ({ selectedDocIds }) =>
            action.execute({ episodes: resolveSelection(selectedDocIds), onSuccess }),
        };
      });
  }, [actions, episodesData, onSuccess]);
