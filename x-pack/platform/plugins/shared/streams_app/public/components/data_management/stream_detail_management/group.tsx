/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { useStreamsPrivileges } from '../../../hooks/use_streams_privileges';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { RedirectTo } from '../../redirect_to';
import { Wrapper } from './wrapper';
import { StreamDetailReferencesView } from '../../stream_detail_references_view/stream_detail_references_view';
import { LinkedDashboardsView } from './linked_dashboards_view';
import { GroupStreamDetailView } from './group_stream_detail_view';

const groupStreamManagementSubTabs = ['overview', 'dashboards', 'references'] as const;

type GroupStreamManagementSubTab = (typeof groupStreamManagementSubTabs)[number];

function isValidManagementSubTab(value: string): value is GroupStreamManagementSubTab {
  return groupStreamManagementSubTabs.includes(value as GroupStreamManagementSubTab);
}

export function GroupStreamDetailManagement({
  definition,
}: {
  definition: Streams.GroupStream.GetResponse;
}) {
  const {
    features: { groupStreams },
  } = useStreamsPrivileges();

  const {
    path: { key, tab },
  } = useStreamsAppParams('/{key}/management/{tab}');

  if (!groupStreams?.enabled) {
    return <RedirectTo path="/" />;
  }

  const tabs = {
    overview: {
      content: <GroupStreamDetailView stream={definition} />,
      label: i18n.translate('xpack.streams.streamDetailView.overviewTab', {
        defaultMessage: 'Overview',
      }),
    },
    references: {
      content: <StreamDetailReferencesView definition={definition} />,
      label: i18n.translate('xpack.streams.streamDetailView.referencesTab', {
        defaultMessage: 'References',
      }),
    },
    dashboards: {
      content: <LinkedDashboardsView definition={definition} />,
      label: i18n.translate('xpack.streams.streamDetailView.dashboardsTab', {
        defaultMessage: 'Dashboards',
      }),
    },
  };

  if (!isValidManagementSubTab(tab) || tabs[tab] === undefined) {
    return (
      <RedirectTo path="/{key}/management/{tab}" params={{ path: { key, tab: 'overview' } }} />
    );
  }

  return <Wrapper tabs={tabs} streamId={key} tab={tab} />;
}
