/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { UnifiedDocViewerStart } from '@kbn/unified-doc-viewer-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { useFetchEpisodeEventsQuery } from '../../hooks/use_fetch_episode_events_query';
import { useFetchEpisodeEventDataQuery } from '../../hooks/use_fetch_episode_event_data_query';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { useAlertingEpisodeSourceDataView } from '../../hooks/use_alerting_episode_source_data_view';
import { getRuleIdFromEpisodeRows } from '../../utils/episode_series_derived';
import { AlertEpisodeMetadataTable } from './metadata_table';
import type { AlertEpisodeDetailsServices } from './types';
import * as i18n from './translations';

export interface AlertEpisodeMetadataSectionServices extends AlertEpisodeDetailsServices {
  dataViews: DataViewsPublicPluginStart;
  uiSettings: IUiSettingsClient;
  unifiedDocViewer: UnifiedDocViewerStart;
}

export interface AlertEpisodeMetadataSectionProps {
  episodeId: string;
  services: AlertEpisodeMetadataSectionServices;
  /**
   * Pixels to subtract from the table's available-height calculation. Use this
   * when rendering inside a container that has a footer/sibling element below
   * the table (e.g. an `EuiFlyoutFooter`) — without this, the doc-viewer
   * table's internal scroll measures against `window.innerHeight` and would
   * extend past the visible area. Defaults to the unified-doc-viewer's own
   * `DEFAULT_MARGIN_BOTTOM` (16px).
   */
  decreaseAvailableHeightBy?: number;
}

export const AlertEpisodeMetadataSection = ({
  episodeId,
  services,
  decreaseAvailableHeightBy,
}: AlertEpisodeMetadataSectionProps) => {
  const { data: eventRows, isLoading: isLoadingEvents } = useFetchEpisodeEventsQuery({
    episodeId,
    data: services.data,
  });
  const rows = eventRows ?? [];
  const ruleId = getRuleIdFromEpisodeRows(rows);

  const { data: rule } = useFetchRule({ id: ruleId, http: services.http });

  const {
    data: eventData,
    isLoading: isEventDataLoading,
    isError,
  } = useFetchEpisodeEventDataQuery({
    episodeId,
    data: services.data,
  });

  const { value: dataView, loading: isDataViewLoading } = useAlertingEpisodeSourceDataView({
    query: rule?.evaluation?.query?.base,
    dataViews: services.dataViews,
    http: services.http,
  });

  // Resolve the table render function from the registry once — avoids the
  // EuiTabbedContent wrapper that UnifiedDocViewer adds around all doc views.
  const tableDocView = useMemo(
    () => services.unifiedDocViewer.registry.getAll().find((dv) => dv.id === 'doc_view_table'),
    [services.unifiedDocViewer.registry]
  );

  const hit = useMemo(() => {
    if (!eventData || !dataView) return undefined;
    return buildDataTableRecord({ _source: eventData.data }, dataView);
  }, [eventData, dataView]);

  if (isError) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="alertingV2EpisodeMetadataSectionError">
        {i18n.METADATA_SECTION_ERROR}
      </EuiText>
    );
  }

  if (isLoadingEvents || isEventDataLoading || isDataViewLoading) {
    return <EuiLoadingSpinner size="m" data-test-subj="alertingV2EpisodeMetadataSectionLoading" />;
  }

  if (!hit || !dataView || !eventData) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="alertingV2EpisodeMetadataTabEmpty">
        {i18n.METADATA_SECTION_EMPTY}
      </EuiText>
    );
  }

  return (
    <AlertEpisodeMetadataTable
      hit={hit}
      dataView={dataView}
      renderTable={({ hit: h, dataView: dv }) =>
        tableDocView?.render?.({ hit: h, dataView: dv, decreaseAvailableHeightBy }) ?? null
      }
      isStale={Boolean(eventData.isStale)}
      dataTimestamp={eventData.dataTimestamp}
      dateFormat={services.uiSettings.get('dateFormat') ?? undefined}
    />
  );
};
