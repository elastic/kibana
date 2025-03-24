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
import { StreamDetailManagement } from '../data_management/stream_detail_management';
import { StreamDetailOverview } from '../stream_detail_overview';
import { StreamDetailContextProvider, useStreamDetail } from '../../hooks/use_stream_detail';

export function StreamDetailView() {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;

  const params1 = useStreamsAppParams('/{key}/{tab}', true);
  const params2 = useStreamsAppParams('/{key}/management/{subtab}', true);

  const name = params1?.path?.key || params2.path.key;
  const tab = params1?.path?.tab || 'management';

  return (
    <StreamDetailContextProvider name={name} streamsRepositoryClient={streamsRepositoryClient}>
      <StreamDetailViewContent name={name} tab={tab} />
    </StreamDetailContextProvider>
  );
}

export function StreamDetailViewContent({ name, tab }: { name: string; tab: string }) {
  const { definition, refresh } = useStreamDetail();

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
    {
      name: 'management',
      content: <StreamDetailManagement definition={definition} refreshDefinition={refresh} />,
      label: i18n.translate('xpack.streams.streamDetailView.managementTab', {
        defaultMessage: 'Management',
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
