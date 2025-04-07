/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { EntityDetailViewWithoutParams, EntityViewTab } from '../entity_detail_view';
import { StreamDetailDashboardsView } from '../stream_detail_dashboards_view';
import { StreamDetailOverview } from '../stream_detail_overview';
import { StreamDetailContextProvider, useStreamDetail } from '../../hooks/use_stream_detail';

export function StreamDetailView() {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;

  const {
    path: { key: name },
  } = useStreamsAppParams('/{key}/{tab}', true);

  return (
    <StreamDetailContextProvider name={name} streamsRepositoryClient={streamsRepositoryClient}>
      <StreamDetailViewContent />
    </StreamDetailContextProvider>
  );
}

export function StreamDetailViewContent() {
  const { path } = useStreamsAppParams('/{key}/{tab}', true);
  const { key: name, tab } = path;

  const { definition } = useStreamDetail();

  const entity = {
    id: name,
    displayName: name,
  };

  const tabs: EntityViewTab[] = [
    {
      name: 'overview',
      content: <StreamDetailOverview definition={definition} />,
      label: i18n.translate('xpack.streams.streamDetailView.overviewTab', {
        defaultMessage: 'Overview',
      }),
      background: false,
    },
    {
      name: 'dashboards',
      content: <StreamDetailDashboardsView definition={definition} />,
      label: i18n.translate('xpack.streams.streamDetailView.dashboardsTab', {
        defaultMessage: 'Dashboards',
      }),
      background: true,
    },
  ];

  return (
    <EntityDetailViewWithoutParams
      tabs={tabs}
      entity={entity}
      definition={definition}
      selectedTab={tab}
    />
  );
}
