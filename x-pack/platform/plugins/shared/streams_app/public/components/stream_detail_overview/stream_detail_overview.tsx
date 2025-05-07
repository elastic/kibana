/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { Streams } from '@kbn/streams-schema';
import { QuickLinks } from './quick_links';
import { ChildStreamList } from './child_stream_list';
import { StreamStatsPanel } from './components/stream_stats_panel';
import { StreamChartPanel } from './components/stream_chart_panel';
import { TabsPanel } from './components/tabs_panel';

export function StreamDetailOverview({
  definition,
}: {
  definition: Streams.ingest.all.GetResponse;
}) {
  const tabs = useMemo(
    () => [
      ...(definition && Streams.WiredStream.GetResponse.is(definition)
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
              <StreamChartPanel definition={definition} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
