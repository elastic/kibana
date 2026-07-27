/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiIcon,
  EuiLoadingElastic,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import type { AppHeaderMenu, AppHeaderTab } from '@kbn/app-header';
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
import { StreamsAppHeader, StreamsAppPageTemplate } from '../streams_app_page_template';
import { SecondaryNavPlaceholder } from './secondary_nav_placeholder';
import { WelcomeTourCallout } from '../streams_tour';
import { ClassicStreamCreationFlyout } from './classic_stream_creation_flyout';
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
import { CreateQueryStreamFlyoutContent } from '../query_streams/create_query_stream_flyout';
import { getFormattedError } from '../../util/errors';
import { StreamsMarketingToast } from './marketing_toast';

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

/**
 * Compact primary banner shown in the chrome's header-banner slot (above the
 * whole Kibana body). It's sized to fill the fixed banner height rather than
 * using an `EuiCallOut`, which is too tall for that slot.
 */
function PrototypeBanner({ onDismiss }: { onDismiss: () => void }) {
  const { euiTheme } = useEuiTheme();
  const message = i18n.translate('xpack.streams.streamsListView.prototypeCalloutTitle', {
    defaultMessage:
      'This is a UX prototype using hardcoded dummy data. Scope and capabilities are limited.',
  });
  const dismissLabel = i18n.translate(
    'xpack.streams.streamsListView.prototypeCalloutDismissLabel',
    {
      defaultMessage: 'Dismiss',
    }
  );

  return (
    <div
      data-test-subj="streamsPrototypeBanner"
      className={css`
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: ${euiTheme.size.s};
        height: 100%;
        width: 100%;
        padding-inline: ${euiTheme.size.xl};
        background-color: ${euiTheme.colors.backgroundBaseInteractiveHoverAssistance};
        color: ${euiTheme.colors.textAssistance};
      `}
    >
      <EuiIcon type="info" size="s" color={euiTheme.colors.textAssistance} />
      <EuiText size="s" color={euiTheme.colors.textAssistance}>
        {message}
      </EuiText>
      <EuiButtonIcon
        iconType="cross"
        color="text"
        size="xs"
        aria-label={dismissLabel}
        onClick={onDismiss}
        data-test-subj="streamsPrototypeBannerDismiss"
        className={css`
          position: absolute;
          inset-inline-end: ${euiTheme.size.s};
          top: 50%;
          transform: translateY(-50%);
          color: ${euiTheme.colors.textAssistance};
          svg {
            fill: ${euiTheme.colors.textAssistance};
          }
        `}
      />
    </div>
  );
}

export function StreamListView() {
  const context = useKibana();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient, getClassicStatus, getWiredStatus },
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
    ui: { manage: canManageStreamsKibana },
    features: { significantEvents, queryStreams },
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

  const [isPrototypeCalloutVisible, setIsPrototypeCalloutVisible] = React.useState(true);

  // Render the prototype notice in the chrome header-banner slot, which sits above the entire
  // Kibana body and pushes the app content down (rather than overlaying it like a fixed banner).
  useEffect(() => {
    if (isPrototypeCalloutVisible) {
      core.chrome.setHeaderBanner({
        content: <PrototypeBanner onDismiss={() => setIsPrototypeCalloutVisible(false)} />,
      });
    } else {
      core.chrome.setHeaderBanner(undefined);
    }
    return () => core.chrome.setHeaderBanner(undefined);
  }, [isPrototypeCalloutVisible, core.chrome]);

  // Prototype behavior: show the "marketing" toast on every (hard) refresh of the
  // Streams landing page, rather than persisting a "seen" flag.
  const [isMarketingToastVisible, setIsMarketingToastVisible] = React.useState(
    viewMode !== 'secondaryNav'
  );

  const [isSettingsFlyoutOpen, setIsSettingsFlyoutOpen] = React.useState(false);
  const [isClassicStreamCreationFlyoutOpen, setIsClassicStreamCreationFlyoutOpen] =
    React.useState(false);
  const [isQueryStreamCreationFlyoutOpen, setIsQueryStreamCreationFlyoutOpen] =
    React.useState(false);

  const pageTitle = i18n.translate('xpack.streams.streamsListView.pageHeaderTitle', {
    defaultMessage: 'Streams',
  });
  const settingsLabel = i18n.translate('xpack.streams.streamsListView.settingsButtonLabel', {
    defaultMessage: 'Settings',
  });
  const significantEventsLabel = i18n.translate(
    'xpack.streams.streamsListView.sigEventsDiscoveryButtonLabel',
    { defaultMessage: 'Significant Events' }
  );
  const createLabel = i18n.translate('xpack.streams.streamsListView.createButtonLabel', {
    defaultMessage: 'Create',
  });
  const queryStreamMenuItemLabel = i18n.translate(
    'xpack.streams.streamsListView.queryStreamMenuItemLabel',
    { defaultMessage: 'Query stream' }
  );
  const classicStreamMenuItemLabel = i18n.translate(
    'xpack.streams.streamsListView.classicStreamMenuItemLabel',
    { defaultMessage: 'Classic stream' }
  );

  const showSignificantEventsDiscovery = Boolean(significantEvents?.available);
  const showQueryStreams = Boolean(queryStreams?.enabled);
  const canCreateClassicStream = canManageStreamsKibana && canManageClassicElasticsearch;
  const significantEventsDiscoveryHref = router.link('/_discovery');

  const menu = useMemo<AppHeaderMenu>(() => {
    const items: NonNullable<AppHeaderMenu['items']> = [
      {
        id: 'settings',
        order: 1,
        label: settingsLabel,
        iconType: 'gear',
        run: () => setIsSettingsFlyoutOpen(true),
        overflow: true,
        testId: 'streamsAppSettingsButton',
      },
    ];

    if (showSignificantEventsDiscovery) {
      items.push({
        id: 'significantEventsDiscovery',
        order: 2,
        label: significantEventsLabel,
        iconType: 'significantEvents',
        href: significantEventsDiscoveryHref,
        testId: 'streamsSignificantEventsDiscoveryButton',
      });
    }

    if (showQueryStreams) {
      return {
        primaryActionItem: {
          id: 'createStream',
          label: createLabel,
          iconType: 'plus',
          testId: 'streamsAppCreateStreamButton',
          items: [
            {
              id: 'createClassicStream',
              order: 1,
              label: classicStreamMenuItemLabel,
              run: () => setIsClassicStreamCreationFlyoutOpen(true),
              disableButton: !canCreateClassicStream,
              testId: 'streamsAppCreateClassicStreamButton',
            },
            {
              id: 'createQueryStream',
              order: 2,
              label: queryStreamMenuItemLabel,
              run: () => setIsQueryStreamCreationFlyoutOpen(true),
              testId: 'streamsAppCreateQueryStreamButton',
            },
          ],
        },
        items,
      };
    }

    return {
      items,
    };
  }, [
    canCreateClassicStream,
    classicStreamMenuItemLabel,
    createLabel,
    queryStreamMenuItemLabel,
    settingsLabel,
    showQueryStreams,
    showSignificantEventsDiscovery,
    significantEventsDiscoveryHref,
    significantEventsLabel,
  ]);

  // Canvas / Sources / Pipelines / Destinations — the prototype's own tabs,
  // surfaced through the new AppHeader's native `tabs` slot.
  const tabs: AppHeaderTab[] = STREAMS_LIST_TABS.map((tab) => ({
    id: tab,
    label: STREAMS_LIST_TAB_LABELS[tab],
    href: buildListTabHref(router.link('/'), { ...restQuery, tab }),
    isSelected: tab === activeTab,
    'data-test-subj': `streamsListTab-${tab}`,
  }));

  if (viewMode === 'secondaryNav') {
    return (
      <>
        <StreamsAppHeader title={pageTitle} />
        <StreamsAppPageTemplate.Body grow noPadding>
          <SecondaryNavPlaceholder />
        </StreamsAppPageTemplate.Body>
      </>
    );
  }

  return (
    <>
      {isMarketingToastVisible && (
        <StreamsMarketingToast
          exploreHref={buildListTabHref(router.link('/'), { ...restQuery, tab: 'canvas' })}
          onClose={() => setIsMarketingToastVisible(false)}
        />
      )}
      <StreamsAppHeader
        title={pageTitle}
        tabs={tabs}
        menu={menu}
        docLink={streamsDocsLink}
        padding="m"
      />
      <StreamsAppPageTemplate.Body grow paddingSize="m">
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
      {isClassicStreamCreationFlyoutOpen && (
        <ClassicStreamCreationFlyout onClose={() => setIsClassicStreamCreationFlyoutOpen(false)} />
      )}
      {isQueryStreamCreationFlyoutOpen && (
        <CreateQueryStreamFlyoutContent
          onClose={() => setIsQueryStreamCreationFlyoutOpen(false)}
          onQueryStreamCreated={streamsListFetch.refresh}
        />
      )}
    </>
  );
}
