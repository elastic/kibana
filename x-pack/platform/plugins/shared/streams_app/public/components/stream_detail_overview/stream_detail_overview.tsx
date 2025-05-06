/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { IngestStreamGetResponse, isWiredStreamDefinition } from '@kbn/streams-schema';
import { QuickLinks } from './quick_links';
import { ChildStreamList } from './child_stream_list';
import { StreamStatsPanel } from './components/stream_stats_panel';
import { StreamChartPanel } from './components/stream_chart_panel';
import { TabsPanel } from './components/tabs_panel';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { StreamsGraph } from '../streams_graph';

export function StreamDetailOverview({ definition }: { definition: IngestStreamGetResponse }) {
  const tabs = useMemo(
    () => [
      ...(definition && isWiredStreamDefinition(definition.stream)
        ? [
            {
              id: 'streams',
              name: i18n.translate('xpack.streams.entityDetailOverview.tabs.streams', {
                defaultMessage: 'Streams',
              }),
              content: <ChildStreamList definition={definition} />,
            },
          ]
        : []),
      {
        id: 'quicklinks',
        name: i18n.translate('xpack.streams.entityDetailOverview.tabs.quicklinks', {
          defaultMessage: 'Quick Links',
        }),
        content: <QuickLinks definition={definition} />,
      },
    ],
    [definition]
  );

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <StreamStatsPanel definition={definition} />
        </EuiFlexItem>

        <EuiFlexItem grow>
          <EuiFlexGroup direction="row" gutterSize="m">
            <EuiFlexItem grow={4}>
              <TabsPanel tabs={tabs} />
            </EuiFlexItem>
            <EuiFlexItem grow={8}>
              <EuiFlexGroup direction="column" gutterSize="m">
                <StreamChartPanel definition={definition} />
                <RelatedStreamPanel definition={definition} />
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

function RelatedStreamPanel({ definition }: { definition: IngestStreamGetResponse }) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const streamsListFetch = useStreamsAppFetch(
    async ({ signal }) => {
      const { streams } = await streamsRepositoryClient.fetch('GET /internal/streams', {
        signal,
      });
      return streams;
    },
    [streamsRepositoryClient]
  );

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiText>Related Streams:</EuiText>
      <EuiFlexGroup direction="column" gutterSize="m">
        <StreamsGraph streams={streamsListFetch.value} currentStream={definition.stream} />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
