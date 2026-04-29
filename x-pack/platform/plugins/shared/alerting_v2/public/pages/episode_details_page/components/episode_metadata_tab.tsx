/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { useFetchEpisodeEventDataQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_event_data_query';
import { useAlertingEpisodeSourceDataView } from '@kbn/alerting-v2-episodes-ui/hooks/use_alerting_episode_source_data_view';
import type { AlertEpisodesKibanaServices } from '../../../episodes_kibana_services';

interface EpisodeMetadataTabProps {
  episodeId: string;
  ruleQuery?: string;
}

export const EpisodeMetadataTab = ({ episodeId, ruleQuery }: EpisodeMetadataTabProps) => {
  const { services } = useKibana<AlertEpisodesKibanaServices>();
  const { data, unifiedDocViewer } = services;

  const {
    data: eventData,
    isLoading: isEventDataLoading,
    isError,
  } = useFetchEpisodeEventDataQuery({
    episodeId,
    data,
  });

  const { value: dataView, loading: isDataViewLoading } = useAlertingEpisodeSourceDataView({
    query: ruleQuery,
    services,
  });

  // Resolve the table render function from the registry once — avoids the
  // EuiTabbedContent wrapper that UnifiedDocViewer adds around all doc views.
  const tableDocView = useMemo(
    () => unifiedDocViewer.registry.getAll().find((dv) => dv.id === 'doc_view_table'),
    [unifiedDocViewer.registry]
  );

  const hit = useMemo(() => {
    if (!eventData || !dataView) return undefined;
    return buildDataTableRecord({ _source: eventData }, dataView);
  }, [eventData, dataView]);

  if (isError) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.alertingV2.episodeDetails.metadataTab.error', {
          defaultMessage: 'Failed to load metadata.',
        })}
      </EuiText>
    );
  }

  if (isEventDataLoading || isDataViewLoading) {
    return <EuiLoadingSpinner size="m" />;
  }

  if (!hit || !dataView) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="alertingV2EpisodeMetadataTabEmpty">
        {i18n.translate('xpack.alertingV2.episodeDetails.metadataTab.empty', {
          defaultMessage: 'No evaluation data is available for this episode.',
        })}
      </EuiText>
    );
  }

  return tableDocView?.render?.({ hit, dataView }) ?? null;
};
