/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLoadingElastic, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useStreamsAppBreadcrumbs } from '../../../hooks/use_streams_app_breadcrumbs';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../../hooks/use_streams_privileges';
import { useUnbackedQueriesCount } from '../../../hooks/sig_events/use_unbacked_queries_count';
import { RedirectTo } from '../../redirect_to';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { FeaturesTable } from './components/features_table/features_table';
import { QueriesTable } from './components/queries_table/queries_table';
import { SettingsTab } from './components/settings/tab';
import { StreamsView } from './components/streams_view/streams_view';

const managerTabs = ['streams', 'knowledge_indicators', 'queries', 'settings'] as const;
type ManagerTab = (typeof managerTabs)[number];

function isValidManagerTab(value: string): value is ManagerTab {
  return managerTabs.includes(value as ManagerTab);
}

export function SignificantEventsManagerPage() {
  const {
    path: { tab },
  } = useStreamsAppParams('/_discovery/manage/{tab}');

  const router = useStreamsAppRouter();

  const {
    features: { significantEventsDiscovery },
  } = useStreamsPrivileges();
  const { euiTheme } = useEuiTheme();
  const { count: unbackedQueriesCount, refetch } = useUnbackedQueriesCount();

  useStreamsAppBreadcrumbs(() => {
    return [
      {
        title: i18n.translate('xpack.streams.significantEventsManager.breadcrumbTitle', {
          defaultMessage: 'Manager',
        }),
        path: '/_discovery/manage',
      },
    ];
  }, []);

  if (significantEventsDiscovery === undefined) {
    return <EuiLoadingElastic size="xxl" />;
  }

  if (!significantEventsDiscovery.available || !significantEventsDiscovery.enabled) {
    return <RedirectTo path="/" />;
  }

  if (!isValidManagerTab(tab)) {
    return (
      <RedirectTo path="/_discovery/manage/{tab}" params={{ path: { tab: 'streams' } }} />
    );
  }

  const tabs = [
    {
      id: 'streams',
      label: i18n.translate('xpack.streams.significantEventsManager.streamsTab', {
        defaultMessage: 'Streams',
      }),
      href: router.link('/_discovery/manage/{tab}', { path: { tab: 'streams' } }),
      isSelected: tab === 'streams',
    },
    {
      id: 'knowledge_indicators',
      label: i18n.translate('xpack.streams.significantEventsManager.featuresTab', {
        defaultMessage: 'Features',
      }),
      href: router.link('/_discovery/manage/{tab}', { path: { tab: 'knowledge_indicators' } }),
      isSelected: tab === 'knowledge_indicators',
    },
    {
      id: 'queries',
      label: (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.streams.significantEventsManager.queriesTab', {
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
      href: router.link('/_discovery/manage/{tab}', { path: { tab: 'queries' } }),
      isSelected: tab === 'queries',
    },
    {
      id: 'settings',
      label: i18n.translate('xpack.streams.significantEventsManager.settingsTab', {
        defaultMessage: 'Settings',
      }),
      href: router.link('/_discovery/manage/{tab}', { path: { tab: 'settings' } }),
      isSelected: tab === 'settings',
    },
  ];

  return (
    <>
      <StreamsAppPageTemplate.Header
        bottomBorder="extended"
        css={css`
          background: ${euiTheme.colors.backgroundBasePlain};
        `}
        pageTitle={i18n.translate('xpack.streams.significantEventsManager.pageHeaderTitle', {
          defaultMessage: 'Manager',
        })}
        tabs={tabs}
      />
      <StreamsAppPageTemplate.Body grow>
        {tab === 'streams' && <StreamsView refreshUnbackedQueriesCount={refetch} />}
        {tab === 'knowledge_indicators' && <FeaturesTable />}
        {tab === 'queries' && <QueriesTable />}
        {tab === 'settings' && <SettingsTab />}
      </StreamsAppPageTemplate.Body>
    </>
  );
}
