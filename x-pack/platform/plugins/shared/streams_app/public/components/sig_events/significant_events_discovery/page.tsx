/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingElastic,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useIsMutating } from '@kbn/react-query';
import { useStreamsAppBreadcrumbs } from '../../../hooks/use_streams_app_breadcrumbs';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../../hooks/use_streams_privileges';
import { useUnbackedQueriesCount } from '../../../hooks/sig_events/use_unbacked_queries_count';
import { useDiscoverySettings } from './context';
import { RedirectTo } from '../../redirect_to';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { KnowledgeIndicatorsTable } from './components/knowledge_indicators_table';
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
    features: { significantEventsDiscovery },
  } = useStreamsPrivileges();
  const { euiTheme } = useEuiTheme();
  const { count: unbackedQueriesCount, refetch } = useUnbackedQueriesCount();

  const { isMemoryEnabled, isLoading: isSettingsLoading } = useDiscoverySettings();
  const isPromotingQueries = useIsMutating({ mutationKey: ['promoteAll'] }) > 0;

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
        label: i18n.translate('xpack.streams.significantEventsDiscovery.queriesTab', {
          defaultMessage: 'Rules',
        }),
        append: isPromotingQueries ? (
          <EuiLoadingSpinner />
        ) : unbackedQueriesCount > 0 ? (
          <EuiBadge color="accent">{unbackedQueriesCount}</EuiBadge>
        ) : undefined,
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
  }, [tab, router, unbackedQueriesCount, isMemoryEnabled, isPromotingQueries]);

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
    if (isSettingsLoading) {
      return <EuiLoadingElastic size="xxl" />;
    }
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
          </EuiFlexGroup>
        }
        tabs={tabs}
      />
      <StreamsAppPageTemplate.Body grow>
        {tab === 'streams' && <StreamsView refreshUnbackedQueriesCount={refetch} />}
        {tab === 'knowledge_indicators' && <KnowledgeIndicatorsTable />}
        {tab === 'queries' && <QueriesTable />}
        {tab === 'significant_events' && <InsightsTab />}
        {tab === 'memory' && isMemoryEnabled && <MemoryTab />}
        {tab === 'settings' && <SettingsTab />}
      </StreamsAppPageTemplate.Body>
    </>
  );
}
