/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiTab,
  EuiTabs,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { calculateAuto } from '@kbn/calculate-auto';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useMemo } from 'react';
import { css } from '@emotion/css';
import {
  IngestStreamGetResponse,
  IngestStreamLifecycleILM,
  isDescendantOf,
  isUnwiredStreamGetResponse,
  isWiredStreamDefinition,
} from '@kbn/streams-schema';
import type { SanitizedDashboardAsset } from '@kbn/streams-plugin/server/routes/dashboards/route';
import { ILM_LOCATOR_ID, IlmLocatorParams } from '@kbn/index-lifecycle-management-common-shared';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { ControlledEsqlChart } from '../esql_chart/controlled_esql_chart';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { getIndexPatterns } from '../../util/hierarchy_helpers';
import { StreamsList } from '../streams_list';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useDashboardsFetch } from '../../hooks/use_dashboards_fetch';
import { DashboardsTable } from '../stream_detail_dashboards_view/dashboard_table';
import { AssetImage } from '../asset_image';
import { useWiredStreams } from '../../hooks/use_wired_streams';
import { useDataStreamStats } from '../data_management/stream_detail_lifecycle/hooks/use_data_stream_stats';
import { IlmLink } from '../data_management/stream_detail_lifecycle/ilm_link';
import {
  formatBytes,
  formatIngestionRate,
} from '../data_management/stream_detail_lifecycle/helpers/format_bytes';

const formatNumber = (val: number) => {
  return Number(val).toLocaleString('en', {
    maximumFractionDigits: 1,
  });
};

export function StreamDetailOverview({ definition }: { definition?: IngestStreamGetResponse }) {
  const {
    dependencies: {
      start: {
        data,
        dataViews,
        streams: { streamsRepositoryClient },
        share,
      },
    },
  } = useKibana();

  const {
    timeRange,
    setTimeRange,
    absoluteTimeRange: { start, end },
  } = data.query.timefilter.timefilter.useTimefilter();

  const indexPatterns = useMemo(() => {
    return getIndexPatterns(definition?.stream);
  }, [definition]);

  const discoverLocator = useMemo(
    () => share.url.locators.get('DISCOVER_APP_LOCATOR'),
    [share.url.locators]
  );

  const queries = useMemo(() => {
    if (!indexPatterns) {
      return undefined;
    }

    const baseQuery = `FROM ${indexPatterns.join(', ')}`;

    const bucketSize = Math.round(
      calculateAuto.atLeast(50, moment.duration(1, 'minute'))!.asSeconds()
    );

    const histogramQuery = `${baseQuery} | STATS metric = COUNT(*) BY @timestamp = BUCKET(@timestamp, ${bucketSize} seconds)`;

    return {
      baseQuery,
      histogramQuery,
    };
  }, [indexPatterns]);

  const discoverLink = useMemo(() => {
    if (!discoverLocator || !queries?.baseQuery) {
      return undefined;
    }

    return discoverLocator.getRedirectUrl({
      query: {
        esql: queries.baseQuery,
      },
    });
  }, [queries?.baseQuery, discoverLocator]);

  const histogramQueryFetch = useStreamsAppFetch(
    async ({ signal }) => {
      if (!queries?.histogramQuery || !indexPatterns) {
        return undefined;
      }

      const existingIndices = await dataViews.getExistingIndices(indexPatterns);

      if (existingIndices.length === 0) {
        return undefined;
      }

      return streamsRepositoryClient.fetch('POST /internal/streams/esql', {
        params: {
          body: {
            operationName: 'get_histogram_for_stream',
            query: queries.histogramQuery,
            start,
            end,
          },
        },
        signal,
      });
    },
    [indexPatterns, dataViews, streamsRepositoryClient, queries?.histogramQuery, start, end]
  );

  const docCountFetch = useStreamsAppFetch(
    async ({ signal }) => {
      if (
        !definition ||
        (isUnwiredStreamGetResponse(definition) && !definition.data_stream_exists)
      ) {
        return undefined;
      }
      return streamsRepositoryClient.fetch('GET /api/streams/{name}/_details', {
        signal,
        params: {
          path: {
            name: definition.stream.name,
          },
          query: {
            start: String(start),
            end: String(end),
          },
        },
      });
    },

    [definition, dataViews, streamsRepositoryClient, start, end]
  );

  const { euiTheme } = useEuiTheme();

  const dataStreamStats = useDataStreamStats({ definition });

  const [selectedTab, setSelectedTab] = React.useState<string | undefined>(undefined);

  const tabs = [
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
  ];

  const ilmLocator = share.url.locators.get<IlmLocatorParams>(ILM_LOCATOR_ID);

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" justifyContent="flexEnd">
            <EuiFlexItem grow>
              <StreamsAppSearchBar
                onQuerySubmit={({ dateRange }, isUpdate) => {
                  if (!isUpdate) {
                    histogramQueryFetch.refresh();
                    docCountFetch.refresh();
                    return;
                  }

                  if (dateRange) {
                    setTimeRange({ from: dateRange.from, to: dateRange?.to, mode: dateRange.mode });
                  }
                }}
                onRefresh={() => {
                  histogramQueryFetch.refresh();
                }}
                placeholder={i18n.translate(
                  'xpack.streams.entityDetailOverview.searchBarPlaceholder',
                  {
                    defaultMessage: 'Filter data by using KQL',
                  }
                )}
                dateRangeFrom={timeRange.from}
                dateRangeTo={timeRange.to}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem grow={3}>
              <EuiPanel hasShadow={false} hasBorder>
                <EuiFlexGroup direction="column" gutterSize="xs">
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.streams.entityDetailOverview.retention', {
                      defaultMessage: 'Data retention',
                    })}
                  </EuiText>
                  <EuiText size="m">
                    {definition ? (
                      'dsl' in definition.effective_lifecycle ? (
                        definition?.effective_lifecycle.dsl.data_retention ||
                        i18n.translate('xpack.streams.entityDetailOverview.unlimited', {
                          defaultMessage: 'Keep indefinitely',
                        })
                      ) : (
                        <IlmLink
                          lifecycle={definition.effective_lifecycle as IngestStreamLifecycleILM}
                          ilmLocator={ilmLocator}
                        />
                      )
                    ) : (
                      '-'
                    )}
                  </EuiText>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem grow={9}>
              <EuiPanel hasShadow={false} hasBorder>
                <EuiFlexGroup>
                  <EuiFlexItem grow>
                    <EuiFlexGroup direction="column" gutterSize="xs">
                      <EuiText size="xs" color="subdued">
                        {i18n.translate('xpack.streams.entityDetailOverview.count', {
                          defaultMessage: 'Document count',
                        })}
                      </EuiText>
                      <EuiText size="m">
                        {dataStreamStats.stats
                          ? formatNumber(dataStreamStats.stats.totalDocs || 0)
                          : '-'}
                      </EuiText>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem
                    grow
                    className={css`
                      border-left: 1px solid ${euiTheme.colors.borderBaseSubdued};
                      padding-left: ${euiTheme.size.s};
                    `}
                  >
                    <EuiFlexGroup direction="column" gutterSize="xs">
                      <EuiText size="xs" color="subdued">
                        {i18n.translate('xpack.streams.entityDetailOverview.size', {
                          defaultMessage: 'Storage size',
                        })}
                      </EuiText>
                      <EuiText size="m">
                        {dataStreamStats.stats
                          ? formatBytes(dataStreamStats.stats.sizeBytes || 0)
                          : '-'}
                      </EuiText>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem
                    grow
                    className={css`
                      border-left: 1px solid ${euiTheme.colors.borderBaseSubdued};
                      padding-left: ${euiTheme.size.s};
                    `}
                  >
                    <EuiFlexGroup direction="column" gutterSize="xs">
                      <EuiText size="xs" color="subdued">
                        {i18n.translate('xpack.streams.entityDetailOverview.ingestion', {
                          defaultMessage: 'Ingestion',
                        })}
                      </EuiText>
                      <EuiText size="m">
                        {dataStreamStats.stats
                          ? formatIngestionRate(dataStreamStats.stats.bytesPerDay || 0)
                          : '-'}
                      </EuiText>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem grow={4}>
              {definition && (
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiFlexGroup
                    direction="column"
                    gutterSize="s"
                    className={css`
                      height: 100%;
                    `}
                  >
                    {tabs.length === 1 ? (
                      tabs[0].content
                    ) : (
                      <>
                        <EuiTabs>
                          {tabs.map((tab, index) => (
                            <EuiTab
                              isSelected={(!selectedTab && index === 0) || selectedTab === tab.id}
                              onClick={() => setSelectedTab(tab.id)}
                              key={tab.id}
                            >
                              {tab.name}
                            </EuiTab>
                          ))}
                        </EuiTabs>
                        {
                          tabs.find(
                            (tab, index) => (!selectedTab && index === 0) || selectedTab === tab.id
                          )?.content
                        }
                      </>
                    )}
                  </EuiFlexGroup>
                </EuiPanel>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={8}>
              <EuiPanel hasShadow={false} hasBorder>
                <EuiFlexGroup
                  direction="column"
                  className={css`
                    height: 100%;
                  `}
                >
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup justifyContent="flexEnd">
                      <EuiButtonEmpty
                        data-test-subj="streamsDetailOverviewOpenInDiscoverButton"
                        iconType="discoverApp"
                        href={discoverLink}
                      >
                        {i18n.translate(
                          'xpack.streams.streamDetailOverview.openInDiscoverButtonLabel',
                          {
                            defaultMessage: 'Open in Discover',
                          }
                        )}
                      </EuiButtonEmpty>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow>
                    <ControlledEsqlChart
                      result={histogramQueryFetch}
                      id="entity_log_rate"
                      metricNames={['metric']}
                      height={200}
                      chartType={'bar'}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

const EMPTY_DASHBOARD_LIST: SanitizedDashboardAsset[] = [];

function QuickLinks({ definition }: { definition?: IngestStreamGetResponse }) {
  const router = useStreamsAppRouter();
  const dashboardsFetch = useDashboardsFetch(definition?.stream.name);

  if (definition && !dashboardsFetch.loading && dashboardsFetch.value?.dashboards.length === 0) {
    return (
      <EuiFlexItem grow>
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiFlexItem
            grow={false}
            className={css`
              max-width: 200px;
            `}
          >
            <EuiFlexGroup direction="column" gutterSize="s">
              <AssetImage type="welcome" />
              <EuiText size="m" textAlign="center">
                {i18n.translate('xpack.streams.entityDetailOverview.linkDashboards', {
                  defaultMessage: 'Link dashboards',
                })}
              </EuiText>
              <EuiText size="xs" textAlign="center" color="subdued">
                {i18n.translate('xpack.streams.entityDetailOverview.linkDashboardsText', {
                  defaultMessage: 'Link dashboards to this stream for quick access',
                })}
              </EuiText>
              <EuiFlexGroup justifyContent="center">
                <EuiLink
                  href={router.link('/{key}/{tab}', {
                    path: {
                      key: definition?.stream.name,
                      tab: 'dashboards',
                    },
                  })}
                >
                  {i18n.translate('xpack.streams.entityDetailOverview.createChildStream', {
                    defaultMessage: 'Add dashboards',
                  })}
                </EuiLink>
              </EuiFlexGroup>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  }

  return (
    <DashboardsTable
      dashboards={dashboardsFetch.value?.dashboards ?? EMPTY_DASHBOARD_LIST}
      loading={dashboardsFetch.loading}
    />
  );
}

function ChildStreamList({ definition }: { definition?: IngestStreamGetResponse }) {
  const router = useStreamsAppRouter();

  const { wiredStreams } = useWiredStreams();

  const childrenStreams = useMemo(() => {
    if (!definition) {
      return [];
    }
    return wiredStreams?.filter((d) => isDescendantOf(definition.stream.name, d.name));
  }, [definition, wiredStreams]);

  if (definition && childrenStreams?.length === 0) {
    return (
      <EuiFlexItem grow>
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiFlexItem
            grow={false}
            className={css`
              max-width: 350px;
            `}
          >
            <EuiFlexGroup direction="column" gutterSize="s">
              <AssetImage type="welcome" />
              <EuiText size="m" textAlign="center">
                {i18n.translate('xpack.streams.entityDetailOverview.noChildStreams', {
                  defaultMessage: 'Create streams for your logs',
                })}
              </EuiText>
              <EuiText size="xs" textAlign="center">
                {i18n.translate('xpack.streams.entityDetailOverview.noChildStreams', {
                  defaultMessage:
                    'Create sub streams to split out data with different retention policies, schemas, and more.',
                })}
              </EuiText>
              <EuiFlexGroup justifyContent="center">
                <EuiButton
                  data-test-subj="streamsAppChildStreamListCreateChildStreamButton"
                  iconType="plusInCircle"
                  href={router.link('/{key}/management/{subtab}', {
                    path: {
                      key: definition?.stream.name,
                      subtab: 'route',
                    },
                  })}
                >
                  {i18n.translate('xpack.streams.entityDetailOverview.createChildStream', {
                    defaultMessage: 'Create child stream',
                  })}
                </EuiButton>
              </EuiFlexGroup>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  }

  return <StreamsList streams={childrenStreams} showControls={false} />;
}
