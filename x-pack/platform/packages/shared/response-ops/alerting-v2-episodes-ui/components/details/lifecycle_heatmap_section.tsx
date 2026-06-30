/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { useFetchEpisodeEventsQuery } from '../../hooks/use_fetch_episode_events_query';
import type { AlertEpisodeDetailsServices } from './types';
import * as i18n from './translations';

const AlertEpisodeLifecycleHeatmap = React.lazy(() =>
  import('./lifecycle_heatmap').then((m) => ({ default: m.AlertEpisodeLifecycleHeatmap }))
);

export interface AlertEpisodeLifecycleHeatmapSectionProps {
  episodeId: string;
  services: Pick<AlertEpisodeDetailsServices, 'data' | 'spaces'>;
}

export const AlertEpisodeLifecycleHeatmapSection = ({
  episodeId,
  services,
}: AlertEpisodeLifecycleHeatmapSectionProps) => {
  const {
    data: eventRows,
    isLoading,
    isError,
  } = useFetchEpisodeEventsQuery({ episodeId, services });

  if (isLoading) {
    return (
      <EuiLoadingSpinner
        size="m"
        data-test-subj="alertingV2EpisodeLifecycleHeatmapSectionLoading"
      />
    );
  }

  if (isError) {
    return (
      <EuiText
        size="s"
        color="danger"
        data-test-subj="alertingV2EpisodeLifecycleHeatmapSectionError"
      >
        {i18n.LIFECYCLE_HEATMAP_SECTION_LOAD_ERROR}
      </EuiText>
    );
  }

  return (
    <React.Suspense fallback={<EuiLoadingSpinner size="m" />}>
      <AlertEpisodeLifecycleHeatmap eventRows={eventRows ?? []} />
    </React.Suspense>
  );
};
