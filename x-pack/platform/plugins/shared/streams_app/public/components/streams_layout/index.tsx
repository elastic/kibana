/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { useTimeRange } from '../../hooks/use_time_range';
import { RedirectTo } from '../redirect_to';
import { StreamsAppHeader, StreamsAppPageTemplate } from '../streams_app_page_template';
import {
  DEFAULT_STREAMS_LAYOUT_TAB,
  isStreamsLayoutTab,
  STREAMS_LAYOUT_TABS,
  streamsLayoutTabs,
} from './tabs';

/**
 * Top-level tabbed layout for Streams. It owns the tab bar and delegates each
 * tab's content to the matching entry in the tab registry.
 */
export function StreamsLayout() {
  const {
    path: { tab },
  } = useStreamsAppParams('/new-experience/{tab}');
  const router = useStreamsAppRouter();
  const { rangeFrom, rangeTo } = useTimeRange();
  const {
    features: { canvas },
  } = useStreamsPrivileges();

  const appHeaderTabs = useMemo<AppHeaderTab[]>(
    () =>
      STREAMS_LAYOUT_TABS.map((tabId) => ({
        id: tabId,
        label: streamsLayoutTabs[tabId].label,
        href: router.link('/new-experience/{tab}', {
          path: { tab: tabId },
          query: { rangeFrom, rangeTo },
        }),
        isSelected: tab === tabId,
        'data-test-subj': `streamsLayoutTab-${tabId}`,
      })),
    [tab, router, rangeFrom, rangeTo]
  );

  if (!canvas.enabled) {
    return <RedirectTo path="/" />;
  }

  if (!isStreamsLayoutTab(tab)) {
    return (
      <RedirectTo
        path="/new-experience/{tab}"
        params={{ path: { tab: DEFAULT_STREAMS_LAYOUT_TAB } }}
      />
    );
  }

  const { Component, noPadding } = streamsLayoutTabs[tab];

  return (
    <>
      <StreamsAppHeader
        title={i18n.translate('xpack.streams.streamsLayout.pageHeaderTitle', {
          defaultMessage: 'Streams',
        })}
        tabs={appHeaderTabs}
      />
      <StreamsAppPageTemplate.Body noPadding={noPadding} paddingSize="m">
        <Component />
      </StreamsAppPageTemplate.Body>
    </>
  );
}
