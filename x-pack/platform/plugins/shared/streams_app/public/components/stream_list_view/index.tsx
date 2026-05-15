/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { i18n } from '@kbn/i18n';
import { SplitButton } from '@kbn/split-button';
import { Streams } from '@kbn/streams-schema';
import type { WiredStreamsStatus } from '@kbn/streams-plugin/public';
import React, { useEffect, useMemo, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

function useIsEmbedded(context: { appParams?: { __embedded?: boolean } } | null): boolean {
  const fromUrl = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash.slice(1);
    const qs = hash.includes('?') ? hash.substring(hash.indexOf('?') + 1) : '';
    return new URLSearchParams(qs).has('embed');
  }, []);
  return Boolean(context?.appParams?.__embedded) || fromUrl;
}

import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { useTimefilter } from '../../hooks/use_timefilter';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { ClassicStreamCreationFlyout } from './classic_stream_creation_flyout';
import {
  IngestHubDemoStreamsDemoToolbar,
  type IngestHubDemoStreamsListViewMode,
} from './ingest_hub_demo_streams_demo_toolbar';
import { MockAwsStreamsCanvas } from './ingest_hub_demo_streams_canvas';
import { MockAwsStreamsTable } from './ingest_hub_demo_streams_table';
import { StreamsListEmptyPrompt } from './streams_list_empty_prompt';
import { StreamsSettingsFlyout } from './streams_settings_flyout';
import { CreateQueryStreamFlyout } from '../query_streams/create_query_stream_flyout';
import { getFormattedError } from '../../util/errors';
import { DataSourcesCatalogFlyout } from '../data_sources_view/data_sources_catalog_flyout';
import { useStreamsListHeaderDatePopoversRightCap } from './use_streams_list_header_date_popovers_right_cap';

const useHasIngestedMockAwsData = () => {
  const [hasData, setHasData] = React.useState(
    () => sessionStorage.getItem('ingestHub:dataAdded') === 'true'
  );

  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'ingestHub:dataAdded') {
        setHasData(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return hasData;
};

const ALL_STREAMS_MOCK_LIST_VIEW_MODE_KEY = 'streams:allStreams:mockListViewMode';

export function StreamListView() {
  const { euiTheme } = useEuiTheme();
  const context = useKibana();
  const isEmbedded = useIsEmbedded(context);
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient, getClassicStatus, getWiredStatus },
      },
    },
    core,
  } = context;
  const { onPageReady } = usePerformanceContext();
  const router = useStreamsAppRouter();

  const { timeState } = useTimefilter();
  const streamsListFetch = useStreamsAppFetch(
    async ({ signal }) =>
      streamsRepositoryClient.fetch('GET /internal/streams', {
        signal,
      }),
    // time state change is used to trigger a refresh of the listed
    // streams metadata but we operate on stale data if we don't
    // also refresh the streams
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streamsRepositoryClient, timeState.start, timeState.end]
  );

  const {
    ui: { manage: canManageStreamsKibana },
    features: { significantEventsDiscovery, queryStreams },
  } = useStreamsPrivileges();

  const [canManageClassicElasticsearch, setCanManageClassicElasticsearch] =
    useState<boolean>(false);
  const [wiredStreamsStatus, setWiredStreamsStatus] = useState<WiredStreamsStatus | undefined>(
    undefined
  );

  useEffect(() => {
    const fetchClassicStatus = async () => {
      try {
        const status = await getClassicStatus();
        setCanManageClassicElasticsearch(Boolean(status.can_manage));
      } catch (error) {
        core.notifications.toasts.addError(getFormattedError(error), {
          title: i18n.translate('xpack.streams.streamsListView.fetchClassicStatusErrorToastTitle', {
            defaultMessage: 'Error fetching classic streams status',
          }),
        });
      }
    };
    fetchClassicStatus();
  }, [getClassicStatus, core.notifications.toasts]);

  const refreshWiredStatus = React.useCallback(async () => {
    try {
      const status = await getWiredStatus();
      setWiredStreamsStatus(status);
    } catch (error) {
      core.notifications.toasts.addError(getFormattedError(error), {
        title: i18n.translate('xpack.streams.streamsListView.fetchWiredStatusErrorToastTitle', {
          defaultMessage: 'Error fetching wired streams status',
        }),
      });
    }
  }, [getWiredStatus, core.notifications.toasts]);

  useEffect(() => {
    refreshWiredStatus();
  }, [refreshWiredStatus]);

  const { hasClassicStreams, firstClassicStreamName } = useMemo(() => {
    const allStreams = streamsListFetch.value?.streams ?? [];
    const classicStreams = allStreams.filter(
      (item) => item.stream && Streams.ClassicStream.Definition.is(item.stream)
    );
    return {
      hasClassicStreams: classicStreams.length > 0,
      firstClassicStreamName: classicStreams[0]?.stream?.name,
    };
  }, [streamsListFetch.value?.streams]);

  // Telemetry for TTFMP (time to first meaningful paint)
  useEffect(() => {
    if (!streamsListFetch.loading && streamsListFetch.value !== undefined) {
      const streams = streamsListFetch.value.streams ?? [];
      const classicStreamsCount = streams.filter((item) =>
        Streams.ClassicStream.Definition.is(item.stream)
      ).length;
      const wiredStreamsCount = streams.filter((item) =>
        Streams.WiredStream.Definition.is(item.stream)
      ).length;

      onPageReady({
        customMetrics: {
          key1: 'total_streams_count',
          value1: streams.length,
          key2: 'classic_streams_count',
          value2: classicStreamsCount,
          key3: 'wired_streams_count',
          value3: wiredStreamsCount,
        },
      });
    }
  }, [streamsListFetch.loading, streamsListFetch.value, onPageReady]);

  const hasIngestedMockAwsData = useHasIngestedMockAwsData();
  useStreamsListHeaderDatePopoversRightCap(hasIngestedMockAwsData && !isEmbedded);

  const [mockListViewMode, setMockListViewMode] = useLocalStorage<IngestHubDemoStreamsListViewMode>(
    ALL_STREAMS_MOCK_LIST_VIEW_MODE_KEY,
    'table'
  );
  const effectiveMockListViewMode: IngestHubDemoStreamsListViewMode = mockListViewMode ?? 'table';

  const [isSettingsFlyoutOpen, setIsSettingsFlyoutOpen] = React.useState(false);
  const [isCreateClassicStreamActionsOpen, setIsCreateClassicStreamActionsOpen] =
    React.useState(false);
  const [isClassicStreamCreationFlyoutOpen, setIsClassicStreamCreationFlyoutOpen] =
    React.useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = React.useState(false);

  const handleDataConnected = React.useCallback(() => {
    sessionStorage.setItem('ingestHub:dataAdded', 'true');
  }, []);

  return (
    <>
      {!isEmbedded && (
        <StreamsAppPageTemplate.Header
          bottomBorder="extended"
          css={css`
            background: ${euiTheme.colors.backgroundBasePlain};
            box-sizing: border-box;
            min-inline-size: 0;
            padding-inline-end: ${euiTheme.size.l};
          `}
          pageTitle={i18n.translate('xpack.streams.streamsListView.pageHeaderTitle', {
            defaultMessage: 'All streams',
          })}
          rightSideGroupProps={{
            alignItems: 'center',
            responsive: false,
            wrap: false,
            css: css`
              min-inline-size: 0;
              max-inline-size: 100%;
              flex-shrink: 1;
            `,
          }}
          rightSideItems={[
            <EuiFlexGroup
              key="streamsAllStreamsHeaderActions"
              data-test-subj="streamsAllStreamsHeaderActions"
              alignItems="center"
              gutterSize="none"
              responsive={false}
              wrap={false}
              css={css`
                gap: ${euiTheme.size.s};
                min-inline-size: 0;
                max-inline-size: 100%;
              `}
            >
              {significantEventsDiscovery?.available && significantEventsDiscovery.enabled ? (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    href={router.link('/_discovery')}
                    iconType="crosshairs"
                    data-test-subj="streamsSignificantEventsDiscoveryButton"
                  >
                    {i18n.translate('xpack.streams.streamsListView.sigEventsDiscoveryButtonLabel', {
                      defaultMessage: 'SigEvents Discovery',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              ) : null}
              {hasIngestedMockAwsData ? (
                <EuiFlexItem
                  grow={false}
                  css={css`
                    min-inline-size: 0;
                  `}
                >
                  <IngestHubDemoStreamsDemoToolbar
                    listViewMode={effectiveMockListViewMode}
                    onListViewModeChange={setMockListViewMode}
                    showToolbarBottomDivider={false}
                    embedInCard={false}
                    layout="pageHeader"
                  />
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <EuiPopover
                  isOpen={isCreateClassicStreamActionsOpen}
                  closePopover={() => setIsCreateClassicStreamActionsOpen(false)}
                  anchorPosition="downRight"
                  panelPaddingSize="none"
                  repositionOnScroll
                  button={
                    <SplitButton
                      data-test-subj="streamsListViewCreateClassicStream"
                      size="s"
                      color="primary"
                      fill={false}
                      type="button"
                      onClick={() => {
                        setIsCreateClassicStreamActionsOpen(false);
                        setIsClassicStreamCreationFlyoutOpen(true);
                      }}
                      disabled={!(canManageStreamsKibana && canManageClassicElasticsearch)}
                      onSecondaryButtonClick={() =>
                        setIsCreateClassicStreamActionsOpen((open) => !open)
                      }
                      secondaryButtonIcon="arrowDown"
                      secondaryButtonAriaLabel={i18n.translate(
                        'xpack.streams.streamsListView.createClassicStreamMoreActionsAriaLabel',
                        {
                          defaultMessage: 'More actions for create stream',
                        }
                      )}
                    >
                      {i18n.translate(
                        'xpack.streams.streamsListView.createClassicStreamButtonLabel',
                        {
                          defaultMessage: 'Create classic stream',
                        }
                      )}
                    </SplitButton>
                  }
                >
                  <EuiContextMenuPanel
                    size="s"
                    items={[
                      <EuiContextMenuItem
                        key="settings"
                        data-test-subj="streamsListViewSettingsMenuItem"
                        icon="gear"
                        onClick={() => {
                          setIsCreateClassicStreamActionsOpen(false);
                          setIsSettingsFlyoutOpen(true);
                        }}
                      >
                        {i18n.translate('xpack.streams.streamsListView.settingsButtonLabel', {
                          defaultMessage: 'Settings',
                        })}
                      </EuiContextMenuItem>,
                    ]}
                  />
                </EuiPopover>
              </EuiFlexItem>
              {queryStreams?.enabled ? (
                <EuiFlexItem grow={false}>
                  <CreateQueryStreamFlyout onQueryStreamCreated={streamsListFetch.refresh} />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>,
          ]}
        />
      )}
      <StreamsAppPageTemplate.Body grow={!isEmbedded}>
        {hasIngestedMockAwsData ? (
          effectiveMockListViewMode === 'table' ? (
            <MockAwsStreamsTable />
          ) : (
            <MockAwsStreamsCanvas />
          )
        ) : (
          <StreamsListEmptyPrompt onAddData={() => setIsCatalogOpen(true)} />
        )}
      </StreamsAppPageTemplate.Body>
      {isSettingsFlyoutOpen && (
        <StreamsSettingsFlyout
          onClose={() => setIsSettingsFlyoutOpen(false)}
          refreshStreams={streamsListFetch.refresh}
          streamsStatus={wiredStreamsStatus}
          onRefreshStatus={refreshWiredStatus}
        />
      )}
      {isClassicStreamCreationFlyoutOpen && (
        <ClassicStreamCreationFlyout onClose={() => setIsClassicStreamCreationFlyoutOpen(false)} />
      )}
      {isCatalogOpen && (
        <DataSourcesCatalogFlyout
          onClose={() => setIsCatalogOpen(false)}
          onDataConnected={handleDataConnected}
        />
      )}
    </>
  );
}
