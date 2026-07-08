/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiLoadingElastic } from '@elastic/eui';
import type { AppHeaderMenu } from '@kbn/app-header';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import type { WiredStreamsStatus } from '@kbn/streams-plugin/public';
import { isEmpty } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { useTimefilter } from '../../hooks/use_timefilter';
import { StreamsAppHeader, StreamsAppPageTemplate } from '../streams_app_page_template';
import { WelcomeTourCallout } from '../streams_tour';
import { ClassicStreamCreationFlyout } from './classic_stream_creation_flyout';
import { StreamsListEmptyPrompt } from './streams_list_empty_prompt';
import { StreamsSettingsFlyout } from './streams_settings_flyout';
import { StreamsTreeTable } from './tree_table';
import { LegacyLogsDeprecationCallout } from './legacy_logs_deprecation_callout';
import { CreateQueryStreamFlyoutContent } from '../query_streams/create_query_stream_flyout';
import { getFormattedError } from '../../util/errors';

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
  const createClassicStreamLabel = i18n.translate(
    'xpack.streams.streamsListView.createClassicStreamButtonLabel',
    { defaultMessage: 'Create classic stream' }
  );
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

  const showSignificantEventsDiscovery = Boolean(
    significantEventsDiscovery?.available && significantEventsDiscovery.enabled
  );
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
      primaryActionItem: {
        id: 'createClassicStream',
        label: createClassicStreamLabel,
        iconType: 'plus',
        run: () => setIsClassicStreamCreationFlyoutOpen(true),
        disableButton: !canCreateClassicStream,
        testId: 'streamsAppCreateClassicStreamButton',
      },
      items,
    };
  }, [
    canCreateClassicStream,
    classicStreamMenuItemLabel,
    createClassicStreamLabel,
    createLabel,
    queryStreamMenuItemLabel,
    settingsLabel,
    showQueryStreams,
    showSignificantEventsDiscovery,
    significantEventsDiscoveryHref,
    significantEventsLabel,
  ]);

  return (
    <>
      <StreamsAppHeader title={pageTitle} menu={menu} docLink={streamsDocsLink} padding="m" />
      <StreamsAppPageTemplate.Body grow paddingSize="m">
        {streamsListFetch.loading && streamsListFetch.value === undefined ? (
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
      {isQueryStreamCreationFlyoutOpen && (
        <CreateQueryStreamFlyoutContent
          onClose={() => setIsQueryStreamCreationFlyoutOpen(false)}
          onQueryStreamCreated={streamsListFetch.refresh}
        />
      )}
    </>
  );
}
