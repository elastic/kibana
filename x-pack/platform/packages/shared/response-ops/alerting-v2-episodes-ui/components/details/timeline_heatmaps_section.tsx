/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiPanel, EuiSkeletonRectangle, EuiSkeletonTitle, EuiSpacer, EuiText } from '@elastic/eui';
import { useFetchEpisodeEventsQuery } from '../../hooks/use_fetch_episode_events_query';
import { isSupportedEpisodeSeverity } from '../severity/severity_utils';
import type { AlertEpisodeDetailsServices } from './types';
import * as i18n from './translations';

const AlertEpisodeLifecycleHeatmap = React.lazy(() =>
  import('./lifecycle_heatmap').then((m) => ({ default: m.AlertEpisodeLifecycleHeatmap }))
);

const AlertEpisodeSeverityHeatmap = React.lazy(() =>
  import('./severity_heatmap').then((m) => ({ default: m.AlertEpisodeSeverityHeatmap }))
);

/** Matches the loaded heatmap layout: an xxs title, a spacer, and a 20px-high chart. */
const HeatmapSkeleton = () => (
  <>
    <EuiSkeletonTitle size="xxs" />
    <EuiSpacer size="m" />
    <EuiSkeletonRectangle width="100%" height={20} />
  </>
);

export interface AlertEpisodeTimelineHeatmapsSectionProps {
  episodeId: string;
  services: Pick<AlertEpisodeDetailsServices, 'data' | 'spaces'>;
}

/**
 * Renders the episode (status) timeline and severity timeline inside a single
 * shared bordered panel.
 */
export const AlertEpisodeTimelineHeatmapsSection = ({
  episodeId,
  services,
}: AlertEpisodeTimelineHeatmapsSectionProps) => {
  const {
    data: eventRows,
    isLoading,
    isError,
  } = useFetchEpisodeEventsQuery({ episodeId, services });

  const severityEventRows = useMemo(
    () => (eventRows ?? []).filter((row) => isSupportedEpisodeSeverity(row.severity)),
    [eventRows]
  );

  if (isLoading) {
    return (
      <EuiPanel
        hasBorder
        paddingSize="m"
        data-test-subj="alertingV2EpisodeTimelineHeatmapsSectionLoading"
      >
        <HeatmapSkeleton />
      </EuiPanel>
    );
  }

  if (isError) {
    return (
      <EuiText
        size="s"
        color="danger"
        data-test-subj="alertingV2EpisodeTimelineHeatmapsSectionError"
      >
        {i18n.TIMELINE_HEATMAPS_SECTION_LOAD_ERROR}
      </EuiText>
    );
  }

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="alertingV2EpisodeTimelineHeatmapsSection">
      <React.Suspense fallback={<HeatmapSkeleton />}>
        <AlertEpisodeLifecycleHeatmap eventRows={eventRows ?? []} />
      </React.Suspense>
      {severityEventRows.length > 0 && (
        <>
          <EuiSpacer size="l" />
          <React.Suspense fallback={<HeatmapSkeleton />}>
            <AlertEpisodeSeverityHeatmap eventRows={severityEventRows} />
          </React.Suspense>
        </>
      )}
    </EuiPanel>
  );
};
