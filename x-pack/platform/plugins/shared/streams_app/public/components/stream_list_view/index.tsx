/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingElastic,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import type { WiredStreamsStatus } from '@kbn/streams-plugin/public';
import { isEmpty } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { useStreamsViewMode } from '../../hooks/use_streams_view_mode';
import { useTimefilter } from '../../hooks/use_timefilter';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { SecondaryNavPlaceholder } from './secondary_nav_placeholder';
import { WelcomeTourCallout } from '../streams_tour';
import { PipelinesTable } from './pipelines_table';
import { SourcesTable } from './sources_table';
import { StreamsCanvas } from './streams_canvas';
import { StreamsListEmptyPrompt } from './streams_list_empty_prompt';
import { StreamsSettingsFlyout } from './streams_settings_flyout';
import { StreamsTreeTable } from './tree_table';
import {
  DEFAULT_STREAMS_LIST_TAB,
  STREAMS_LIST_TABS,
  STREAMS_LIST_TAB_LABELS,
  isStreamsListTab,
  type StreamsListTab,
} from './streams_tabs';
import { LegacyLogsDeprecationCallout } from './legacy_logs_deprecation_callout';
import { CreateQueryStreamFlyout } from '../query_streams/create_query_stream_flyout';
import { getFormattedError } from '../../util/errors';

/**
 * Appends the list-view query params (including the active `tab`) to the base
 * streams list href. The `/` route params are fully optional in the typed
 * router, so we build the query string here rather than via `router.link`.
 */
function buildListTabHref(
  baseHref: string,
  query: { rangeFrom?: string; rangeTo?: string; tab?: string }
): string {
  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, value);
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `${baseHref}?${queryString}` : baseHref;
}

export function StreamListView() {
  const { euiTheme } = useEuiTheme();
  const context = useKibana();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient, getWiredStatus },
      },
    },
    core,
  } = context;
  const streamsDocsLink = core.docLinks.links.observability.logsStreams;
  const { onPageReady } = usePerformanceContext();
  const router = useStreamsAppRouter();
  const { viewMode } = useStreamsViewMode();

  const { query } = useStreamsAppParams('/');
  const listViewQuery: { rangeFrom?: string; rangeTo?: string; tab?: string } = query ?? {};
  const { tab: tabFromQuery, ...restQuery } = listViewQuery;
  const activeTab: StreamsListTab = isStreamsListTab(tabFromQuery)
    ? tabFromQuery
    : DEFAULT_STREAMS_LIST_TAB;

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
    features: { significantEventsDiscovery, queryStreams },
  } = useStreamsPrivileges();

  const [wiredStreamsStatus, setWiredStreamsStatus] = useState<WiredStreamsStatus | undefined>(
    undefined
  );

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

  const [isSettingsFlyoutOpen, setIsSettingsFlyoutOpen] = React.useState(false);

  if (viewMode === 'secondaryNav') {
    return (
      <>
        <StreamsAppPageTemplate.Header
          bottomBorder="extended"
          css={css`
            background: ${euiTheme.colors.backgroundBasePlain};
          `}
          pageTitle={i18n.translate('xpack.streams.streamsListView.pageHeaderTitle', {
            defaultMessage: 'Streams',
          })}
        />
        <StreamsAppPageTemplate.Body grow noPadding>
          <SecondaryNavPlaceholder />
        </StreamsAppPageTemplate.Body>
      </>
    );
  }

  return (
    <>
      <StreamsAppPageTemplate.Header
        bottomBorder="extended"
        css={css`
          background: ${euiTheme.colors.backgroundBasePlain};
        `}
        pageTitle={
          <EuiFlexGroup
            justifyContent="spaceBetween"
            gutterSize="s"
            responsive={false}
            alignItems="center"
          >
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="m">
                {i18n.translate('xpack.streams.streamsListView.pageHeaderTitle', {
                  defaultMessage: 'Streams',
                })}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="ellipsis"
                size="s"
                onClick={() => setIsSettingsFlyoutOpen(true)}
                aria-label={i18n.translate('xpack.streams.streamsListView.settingsButtonLabel', {
                  defaultMessage: 'Settings',
                })}
              />
            </EuiFlexItem>
            {significantEventsDiscovery?.available && significantEventsDiscovery.enabled && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  href={router.link('/_discovery')}
                  iconType="crosshairs"
                  size="s"
                  data-test-subj="streamsSignificantEventsDiscoveryButton"
                >
                  {i18n.translate('xpack.streams.streamsListView.sigEventsDiscoveryButtonLabel', {
                    defaultMessage: 'Significant Events',
                  })}
                </EuiButton>
              </EuiFlexItem>
            )}
            {queryStreams?.enabled && (
              <EuiFlexItem grow={false}>
                <CreateQueryStreamFlyout onQueryStreamCreated={streamsListFetch.refresh} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        }
        tabs={STREAMS_LIST_TABS.map((tab) => ({
          label: STREAMS_LIST_TAB_LABELS[tab],
          href: buildListTabHref(router.link('/'), { ...restQuery, tab }),
          isSelected: tab === activeTab,
          'data-test-subj': `streamsListTab-${tab}`,
        }))}
        description={
          <>
            {i18n.translate('xpack.streams.streamsListView.pageHeaderDescription', {
              defaultMessage:
                'Manage how your data is ingested, structured, and retained across all your streams.',
            })}{' '}
            <EuiLink href={streamsDocsLink} target="_blank">
              {i18n.translate('xpack.streams.streamsListView.pageHeaderDescriptionLearnMoreLink', {
                defaultMessage: 'Learn more',
              })}
            </EuiLink>
          </>
        }
      />
      <StreamsAppPageTemplate.Body grow>
        {activeTab === 'canvas' && <StreamsCanvas />}
        {activeTab === 'sources' && <SourcesTable />}
        {activeTab === 'pipelines' && <PipelinesTable />}
        {activeTab === 'destinations' &&
          (streamsListFetch.loading && streamsListFetch.value === undefined ? (
            <EuiEmptyPrompt
              icon={<EuiLoadingElastic size="xl" />}
              title={
                <h2>
                  {i18n.translate('xpack.streams.streamsListView.loadingStreams', {
                    defaultMessage: 'Loading Streams',
                  })}
                </h2>
              }
            />
          ) : !streamsListFetch.loading && isEmpty(streamsListFetch.value?.streams) ? (
            <StreamsListEmptyPrompt />
          ) : (
            <>
              <WelcomeTourCallout
                hasClassicStreams={hasClassicStreams}
                firstClassicStreamName={firstClassicStreamName}
              />
              <LegacyLogsDeprecationCallout
                streamsStatus={wiredStreamsStatus}
                openFlyout={() => setIsSettingsFlyoutOpen(true)}
              />
              <StreamsTreeTable
                loading={streamsListFetch.loading}
                streams={streamsListFetch.value?.streams}
                wiredStreamsStatus={wiredStreamsStatus}
                openFlyout={() => setIsSettingsFlyoutOpen(true)}
              />
            </>
          ))}
      </StreamsAppPageTemplate.Body>
      {isSettingsFlyoutOpen && (
        <StreamsSettingsFlyout
          onClose={() => setIsSettingsFlyoutOpen(false)}
          refreshStreams={streamsListFetch.refresh}
          streamsStatus={wiredStreamsStatus}
          onRefreshStatus={refreshWiredStatus}
        />
      )}
    </>
  );
}
