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
import { useStreamDetailAsIngestStream } from '../../hooks/use_stream_detail';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import type { StatefulStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { RedirectTo } from '../redirect_to';
import { ClassicStreamBadge, LifecycleBadge, WiredStreamBadge } from '../stream_badges';
import { StreamDetailAttachments } from '../stream_detail_attachments';
import { StreamDetailOverview } from '../stream_detail_overview';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { StreamDescription } from './description';
import { FeedbackButton } from '../feedback_button';

const getStreamDetailTabs = ({
  definition,
  router,
}: {
  definition: Streams.ingest.all.GetResponse;
  router: StatefulStreamsAppRouter;
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
      content: <StreamDetailAttachments definition={definition} />,
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

  const { definition } = useStreamDetailAsIngestStream();

  const { features } = useStreamsPrivileges();

  if (tab === 'management') {
    return <RedirectTo path="/{key}/management/{tab}" params={{ path: { tab: 'retention' } }} />;
  }

  if (!isValidStreamDetailTab(tab)) {
    return <RedirectTo path="/{key}/{tab}" params={{ path: { key, tab: 'overview' } }} />;
  }

  const tabs =
    features.significantEvents !== undefined
      ? getStreamDetailTabs({ definition, router })
      : undefined;

  const selectedTabObject = tabs?.[tab as StreamDetailTabName];

  return (
    <>
      <StreamsAppPageTemplate.Header
        bottomBorder="extended"
        description={<StreamDescription definition={definition} />}
        pageTitle={
          <EuiFlexGroup
            direction="row"
            gutterSize="s"
            alignItems="center"
            justifyContent="spaceBetween"
          >
            <EuiFlexGroup gutterSize="s" alignItems="center">
              {key}
              <EuiBadgeGroup gutterSize="s">
                {Streams.ClassicStream.GetResponse.is(definition) && <ClassicStreamBadge />}
                {Streams.WiredStream.GetResponse.is(definition) && <WiredStreamBadge />}
                <LifecycleBadge lifecycle={definition.effective_lifecycle} />
              </EuiBadgeGroup>
            </EuiFlexGroup>
            <FeedbackButton />
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
              path: { key, tab: 'partitioning' },
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
