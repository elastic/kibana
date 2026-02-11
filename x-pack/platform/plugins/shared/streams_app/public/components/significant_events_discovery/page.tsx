/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingElastic, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useStreamsAppBreadcrumbs } from '../../hooks/use_streams_app_breadcrumbs';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { FeedbackButton } from '../feedback_button';
import { RedirectTo } from '../redirect_to';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { QueriesTable } from './components/queries_table';
import { StreamsView } from './components/streams_view/streams_view';
import { InsightsTab } from './components/insights/tab';

const discoveryTabs = ['streams', 'queries', 'insights'] as const;
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

  useStreamsAppBreadcrumbs(() => {
    return [
      {
        title: i18n.translate('xpack.streams.significantEventsDiscovery.breadcrumbTitle', {
          defaultMessage: 'Significant events Discovery',
        }),
        path: '/_discovery',
      },
    ];
  }, []);

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

  const tabs = [
    {
      id: 'streams',
      label: i18n.translate('xpack.streams.significantEventsDiscovery.streamsTab', {
        defaultMessage: 'Streams',
      }),
      href: router.link('/_discovery/{tab}', { path: { tab: 'streams' } }),
      isSelected: tab === 'streams',
    },
    {
      id: 'queries',
      label: i18n.translate('xpack.streams.significantEventsDiscovery.queriesTab', {
        defaultMessage: 'Queries',
      }),
      href: router.link('/_discovery/{tab}', { path: { tab: 'queries' } }),
      isSelected: tab === 'queries',
    },
    {
      id: 'insights',
      label: i18n.translate('xpack.streams.significantEventsDiscovery.insightsTab', {
        defaultMessage: 'Insights',
      }),
      href: router.link('/_discovery/{tab}', { path: { tab: 'insights' } }),
      isSelected: tab === 'insights',
    },
  ];

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
                  defaultMessage: 'Significant Events Discovery',
                })}
              </EuiFlexGroup>
            </EuiFlexItem>
            <FeedbackButton />
          </EuiFlexGroup>
        }
        tabs={tabs}
      />
      <StreamsAppPageTemplate.Body grow>
        {tab === 'streams' && <StreamsView />}
        {tab === 'queries' && <QueriesTable />}
        {tab === 'insights' && <InsightsTab />}
      </StreamsAppPageTemplate.Body>
    </>
  );
}
