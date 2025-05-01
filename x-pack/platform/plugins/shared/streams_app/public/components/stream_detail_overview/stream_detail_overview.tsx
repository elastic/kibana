/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import {
  IngestStreamGetResponse,
  isGroupStreamDefinition,
  isWiredStreamDefinition,
} from '@kbn/streams-schema';

import { QuickLinks } from './quick_links';
import { ChildStreamList } from './child_stream_list';
import { StreamStatsPanel } from './components/stream_stats_panel';
import { StreamChartPanel } from './components/stream_chart_panel';
import { TabsPanel } from './components/tabs_panel';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

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
    core,
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

  const router = useStreamsAppRouter();

  // fina all streams that reference this stream
  const relatedStreams = useMemo(() => {
    if (streamsListFetch.loading || !streamsListFetch.value) {
      return [];
    }
    return streamsListFetch.value.filter((stream) => {
      if (!isGroupStreamDefinition(stream.stream)) {
        return false;
      }
      return stream.stream.group.relationships.some((relationship) => {
        return relationship.name === definition.stream.name;
      });
    });
  }, [streamsListFetch, definition]);

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiText>Related Group Streams:</EuiText>
      <EuiFlexGroup direction="column" gutterSize="m">
        {relatedStreams.map((s) => {
          const groupStream = s.stream;
          if (!isGroupStreamDefinition(groupStream)) {
            return null;
          }
          return (
            <EuiFlexItem key={s.stream.name}>
              <EuiText size="s">
                <EuiLink
                  data-test-subj="streamsAppStreamNodeLink"
                  href={router.link('/{key}', { path: { key: s.stream.name } })}
                >
                  {s.stream.name} <EuiBadge color="hollow">{groupStream.group.category}</EuiBadge>
                </EuiLink>
              </EuiText>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
