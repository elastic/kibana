/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadgeGroup, EuiButton, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import React from 'react';
import { useStreamDetail } from '../../hooks/use_stream_detail';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { StatefulStreamsAppRouter, useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { StreamsFeatures, useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { RedirectTo } from '../redirect_to';
import { ClassicStreamBadge, LifecycleBadge } from '../stream_badges';
import { StreamDetailDashboardsView } from '../stream_detail_dashboards_view';
import { StreamDetailOverview } from '../stream_detail_overview';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { StreamDescription } from './description';

const getStreamDetailTabs = ({
  definition,
  router,
  features,
}: {
  definition: Streams.ingest.all.GetResponse;
  router: StatefulStreamsAppRouter;
  features: StreamsFeatures;
}) =>
  ({
    overview: {
      href: router.link('/{key}/{tab}', {
        path: { key: definition.stream.name, tab: 'overview' },
      }),
      background: false,
      content: <StreamDetailOverview definition={definition} />,
      label: i18n.translate('xpack.streams.streamDetailView.overviewTab', {
        defaultMessage: 'Overview',
      }),
    },
    dashboards: {
      href: router.link('/{key}/{tab}', {
        path: { key: definition.stream.name, tab: 'dashboards' },
      }),
      background: true,
      content: <StreamDetailDashboardsView definition={definition} />,
      label: i18n.translate('xpack.streams.streamDetailView.dashboardsTab', {
        defaultMessage: 'Dashboards',
      }),
    },
  } as const);

export type StreamDetailTabs = ReturnType<typeof getStreamDetailTabs>;
export type StreamDetailTabName = keyof StreamDetailTabs;

function isValidStreamDetailTab(value: string): value is StreamDetailTabName {
  return ['overview', 'dashboards', 'significant_events'].includes(value as StreamDetailTabName);
}

export function StreamDetailView() {
  const router = useStreamsAppRouter();
  const { path } = useStreamsAppParams('/{key}/{tab}', true);
  const { key, tab } = path;

  const { definition } = useStreamDetail();

  const { features } = useStreamsPrivileges();

  if (tab === 'management') {
    return <RedirectTo path="/{key}/management/{tab}" params={{ path: { tab: 'lifecycle' } }} />;
  }

  if (!isValidStreamDetailTab(tab)) {
    return <RedirectTo path="/{key}/{tab}" params={{ path: { key, tab: 'overview' } }} />;
  }

  const tabs =
    features.significantEvents !== undefined
      ? getStreamDetailTabs({ definition, router, features })
      : undefined;

  const selectedTabObject = tabs?.[tab as StreamDetailTabName];

  return (
    <>
      <StreamsAppPageTemplate.Header
        bottomBorder="extended"
        description={<StreamDescription definition={definition} />}
        pageTitle={
          <EuiFlexGroup gutterSize="s" alignItems="center">
            {key}
            <EuiBadgeGroup gutterSize="s">
              {Streams.UnwiredStream.GetResponse.is(definition) && <ClassicStreamBadge />}
              <LifecycleBadge lifecycle={definition.effective_lifecycle} />
            </EuiBadgeGroup>
          </EuiFlexGroup>
        }
        tabs={Object.entries(tabs ?? {}).map(([tabName, { label, href }]) => {
          return {
            label,
            href,
            isSelected: tab === tabName,
          };
        })}
        rightSideItems={[
          <EuiButton
            iconType="gear"
            href={router.link('/{key}/management/{tab}', {
              path: { key, tab: 'route' },
            })}
          >
            {i18n.translate('xpack.streams.entityDetailViewWithoutParams.manageStreamLabel', {
              defaultMessage: 'Manage stream',
            })}
          </EuiButton>,
        ]}
      />
      <StreamsAppPageTemplate.Body color={selectedTabObject?.background ? 'plain' : 'subdued'}>
        {selectedTabObject?.content}
      </StreamsAppPageTemplate.Body>
    </>
  );
}
