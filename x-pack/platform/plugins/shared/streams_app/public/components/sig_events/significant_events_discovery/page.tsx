/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLoadingElastic, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useStreamsAppBreadcrumbs } from '../../../hooks/use_streams_app_breadcrumbs';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../../hooks/use_streams_privileges';
import { useUnbackedQueriesCount } from '../../../hooks/sig_events/use_unbacked_queries_count';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../hooks/use_kibana';
import { FeedbackButton } from '../../feedback_button';
import { RedirectTo } from '../../redirect_to';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { FeaturesTable } from './components/features_table/features_table';
import { QueriesTable } from './components/queries_table/queries_table';
import { StreamsView } from './components/streams_view/streams_view';
import { InsightsTab } from './components/insights/tab';
import { SettingsTab } from './components/settings/tab';
import { MemoryTab } from './components/memory/tab';

const discoveryTabs = [
  'streams',
  'knowledge_indicators',
  'queries',
  'significant_events',
  'memory',
  'settings',
] as const;
type DiscoveryTab = (typeof discoveryTabs)[number];

function isValidDiscoveryTab(value: string): value is DiscoveryTab {
  return discoveryTabs.includes(value as DiscoveryTab);
}

export function SignificantEventsDiscoveryPage() {
  const {
    path: { tab },
  } = useStreamsAppParams('/_discovery/{tab}');

  const router = useStreamsAppRouter();
  const {
    dependencies: {
      start: { streams },
    },
  } = useKibana();

  const {
    features: { significantEventsDiscovery },
  } = useStreamsPrivileges();
  const { euiTheme } = useEuiTheme();
  const { count: unbackedQueriesCount, refetch } = useUnbackedQueriesCount();

  const settingsFetch = useStreamsAppFetch(
    async ({ signal }) =>
      streams.streamsRepositoryClient.fetch('GET /internal/streams/_significant_events/settings', {
        signal,
      }),
    [streams.streamsRepositoryClient]
  );

  const isMemoryEnabled = !settingsFetch.loading && settingsFetch.value?.useMemory === true;

  useStreamsAppBreadcrumbs(() => {
    return [
      {
        title: i18n.translate('xpack.streams.significantEventsDiscovery.breadcrumbTitle', {
          defaultMessage: 'Significant Events',
        }),
        path: '/_discovery',
      },
    ];
  }, []);

  const tabs = useMemo(() => {
    const baseTabs = [
      {
        id: 'streams',
        label: i18n.translate('xpack.streams.significantEventsDiscovery.streamsTab', {
          defaultMessage: 'Streams',
        }),
        href: router.link('/_discovery/{tab}', { path: { tab: 'streams' } }),
        isSelected: tab === 'streams',
      },
      {
        id: 'knowledge_indicators',
        label: i18n.translate('xpack.streams.significantEventsDiscovery.knowledgeIndicatorsTab', {
          defaultMessage: 'Knowledge Indicators',
        }),
        href: router.link('/_discovery/{tab}', { path: { tab: 'knowledge_indicators' } }),
        isSelected: tab === 'knowledge_indicators',
      },
      {
        id: 'queries',
        label: (
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.streams.significantEventsDiscovery.queriesTab', {
                defaultMessage: 'Queries',
              })}
            </EuiFlexItem>
            {unbackedQueriesCount > 0 && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="accent">{unbackedQueriesCount}</EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
        href: router.link('/_discovery/{tab}', { path: { tab: 'queries' } }),
        isSelected: tab === 'queries',
      },
      {
        id: 'significant_events',
        label: i18n.translate('xpack.streams.significantEventsDiscovery.significantEventsTab', {
          defaultMessage: 'Significant Events',
        }),
        href: router.link('/_discovery/{tab}', { path: { tab: 'significant_events' } }),
        isSelected: tab === 'significant_events',
      },
    ];

    if (isMemoryEnabled) {
      baseTabs.push({
        id: 'memory',
        label: i18n.translate('xpack.streams.significantEventsDiscovery.memoryTab', {
          defaultMessage: 'Memory',
        }),
        href: router.link('/_discovery/{tab}', { path: { tab: 'memory' } }),
        isSelected: tab === 'memory',
      });
    }

    baseTabs.push({
      id: 'settings',
      label: i18n.translate('xpack.streams.significantEventsDiscovery.settingsTab', {
        defaultMessage: 'Settings',
      }),
      href: router.link('/_discovery/{tab}', { path: { tab: 'settings' } }),
      isSelected: tab === 'settings',
    });

    return baseTabs;
  }, [tab, router, unbackedQueriesCount, isMemoryEnabled]);

  if (significantEventsDiscovery === undefined) {
    // Waiting to load license
    return <EuiLoadingElastic size="xxl" />;
  }

  if (!significantEventsDiscovery.available || !significantEventsDiscovery.enabled) {
    return <RedirectTo path="/" />;
  }

  if (!isValidDiscoveryTab(tab)) {
    return <RedirectTo path="/_discovery/{tab}" params={{ path: { tab: 'streams' } }} />;
  }

  if (tab === 'memory' && !isMemoryEnabled) {
    return <RedirectTo path="/_discovery/{tab}" params={{ path: { tab: 'streams' } }} />;
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
                {i18n.translate('xpack.streams.significantEventsDiscovery.pageHeaderTitle', {
                  defaultMessage: 'Significant Events',
                })}
              </EuiFlexGroup>
            </EuiFlexItem>
            <FeedbackButton />
          </EuiFlexGroup>
        }
        tabs={tabs}
      />
      <StreamsAppPageTemplate.Body grow>
        {tab === 'streams' && <StreamsView refreshUnbackedQueriesCount={refetch} />}
        {tab === 'knowledge_indicators' && <FeaturesTable />}
        {tab === 'queries' && <QueriesTable />}
        {tab === 'significant_events' && <InsightsTab />}
        {tab === 'memory' && isMemoryEnabled && <MemoryTab />}
        {tab === 'settings' && <SettingsTab />}
      </StreamsAppPageTemplate.Body>
    </>
  );
}
