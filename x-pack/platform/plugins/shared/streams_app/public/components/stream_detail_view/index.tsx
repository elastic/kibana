/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiBadgeGroup,
  EuiButton,
  EuiText,
  EuiPanel,
  EuiFlexItem,
  EuiLink,
  EuiBadge,
} from '@elastic/eui';
import {
  GroupStreamGetResponse,
  IngestStreamGetResponse,
  isGroupStreamDefinition,
  isGroupStreamGetResponse,
  isUnwiredStreamDefinition,
} from '@kbn/streams-schema';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { StreamDetailDashboardsView } from '../stream_detail_dashboards_view';
import { StreamDetailOverview } from '../stream_detail_overview';
import { useStreamDetail, useStreamDetailAsGroupStream } from '../../hooks/use_stream_detail';
import { ClassicStreamBadge, LifecycleBadge } from '../stream_badges';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { StatefulStreamsAppRouter, useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { RedirectTo } from '../redirect_to';
import { QuickLinks } from '../stream_detail_overview/quick_links';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useKibana } from '../../hooks/use_kibana';

const getStreamDetailTabs = ({
  definition,
  router,
}: {
  definition: IngestStreamGetResponse;
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
      content: <StreamDetailDashboardsView definition={definition} />,
      label: i18n.translate('xpack.streams.streamDetailView.dashboardsTab', {
        defaultMessage: 'Dashboards',
      }),
    },
  } as const);

export type StreamDetailTabs = ReturnType<typeof getStreamDetailTabs>;
export type StreamDetailTabName = keyof StreamDetailTabs;

function isValidStreamDetailTab(value: string): value is StreamDetailTabName {
  return ['overview', 'dashboards'].includes(value as StreamDetailTabName);
}

export function StreamDetailView() {
  const router = useStreamsAppRouter();
  const { path } = useStreamsAppParams('/{key}/{tab}', true);
  const { key, tab } = path;

  const { definition } = useStreamDetail();

  if (isGroupStreamGetResponse(definition)) {
    const tabs = getGroupStreamDetailTabs({ definition, router });

    const selectedTabObject = tabs[tab as StreamDetailTabName];

    return (
      <>
        <StreamsAppPageTemplate.Header
          bottomBorder="extended"
          pageTitle={
            <EuiFlexGroup gutterSize="s" alignItems="center">
              {key}
            </EuiFlexGroup>
          }
          tabs={Object.entries(tabs).map(([tabName, { label, href }]) => {
            return {
              label,
              href,
              isSelected: tab === tabName,
            };
          })}
        />
        <StreamsAppPageTemplate.Body color={selectedTabObject.background ? 'plain' : 'subdued'}>
          {selectedTabObject.content}
        </StreamsAppPageTemplate.Body>
      </>
    );
  }

  if (tab === 'management') {
    return <RedirectTo path="/{key}/management/{tab}" params={{ path: { tab: 'route' } }} />;
  }

  if (!isValidStreamDetailTab(tab)) {
    return <RedirectTo path="/{key}/{tab}" params={{ path: { key, tab: 'overview' } }} />;
  }

  const tabs = getStreamDetailTabs({ definition, router });

  const selectedTabObject = tabs[tab as StreamDetailTabName];

  return (
    <>
      <StreamsAppPageTemplate.Header
        bottomBorder="extended"
        pageTitle={
          <EuiFlexGroup gutterSize="s" alignItems="center">
            {key}
            <EuiBadgeGroup gutterSize="s">
              {isUnwiredStreamDefinition(definition.stream) && <ClassicStreamBadge />}
              <LifecycleBadge lifecycle={definition.effective_lifecycle} />
            </EuiBadgeGroup>
          </EuiFlexGroup>
        }
        tabs={Object.entries(tabs).map(([tabName, { label, href }]) => {
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
      <StreamsAppPageTemplate.Body color={selectedTabObject.background ? 'plain' : 'subdued'}>
        {selectedTabObject.content}
      </StreamsAppPageTemplate.Body>
    </>
  );
}

const getGroupStreamDetailTabs = ({
  definition,
  router,
}: {
  definition: GroupStreamGetResponse;
  router: StatefulStreamsAppRouter;
}) =>
  ({
    overview: {
      href: router.link('/{key}/{tab}', {
        path: { key: definition.stream.name, tab: 'overview' },
      }),
      background: false,
      content: <GroupStreamDetailView />,
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

const GroupStreamDetailView = () => {
  const { definition } = useStreamDetailAsGroupStream();
  const stream = definition.stream;
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

  const groupStreamToCategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    streamsListFetch.value?.forEach((s) => {
      if (isGroupStreamDefinition(s.stream)) {
        map.set(s.stream.name, s.stream.group.category);
      }
    });
    return map;
  }, [streamsListFetch.value]);

  const router = useStreamsAppRouter();
  const renderLinks = (links: string[]) =>
    links.length
      ? links
          .map((link, idx) => (
            <EuiLink key={idx} href={link} target="_blank" rel="noopener noreferrer">
              {link}
            </EuiLink>
          ))
          .reduce((prev, curr) => [prev, ', ', curr])
      : 'None';
  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiPanel hasShadow={false} hasBorder>
            <EuiText size="xs">
              <p>Owner: {stream.group.owner}</p>
              <p>Tier: {stream.group.tier}</p>
              <p>Tags: {stream.group.tags.join(', ')}</p>
              <p>Runbook Links: {renderLinks(stream.group.runbook_links)}</p>
              <p>Documentation Links: {renderLinks(stream.group.documentation_links)}</p>
              <p>Repository Links: {renderLinks(stream.group.repository_links)}</p>
              <p>{stream.group.relationships.length} relationships</p>
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem grow>
          <EuiFlexGroup direction="row" gutterSize="m">
            <EuiFlexItem grow={4}>
              <EuiPanel hasShadow={false} hasBorder>
                <QuickLinks definition={definition} />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem grow={8}>
              <EuiPanel hasShadow={false} hasBorder>
                <EuiText>Related Streams:</EuiText>
                <EuiFlexGroup direction="column" gutterSize="m">
                  {stream.group.relationships.map((relationship) => (
                    <EuiFlexItem key={relationship.name}>
                      <EuiText size="s">
                        <EuiLink
                          data-test-subj="streamsAppStreamNodeLink"
                          href={router.link('/{key}', { path: { key: relationship.name } })}
                        >
                          {relationship.name}{' '}
                          {groupStreamToCategoryMap.get(relationship.name) && (
                            <EuiBadge color="hollow">
                              {groupStreamToCategoryMap.get(relationship.name)}
                            </EuiBadge>
                          )}
                        </EuiLink>
                      </EuiText>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
