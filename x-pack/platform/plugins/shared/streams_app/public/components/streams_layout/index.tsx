/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { useTimeRange } from '../../hooks/use_time_range';
import { RedirectTo } from '../redirect_to';
import { StreamsAppHeader, StreamsAppPageTemplate } from '../streams_app_page_template';
import { DEFAULT_STREAMS_LAYOUT_TAB, isStreamsLayoutTab, STREAMS_LAYOUT_TABS } from './tab_ids';
import { streamsLayoutTabs } from './tabs';
import { UnitNotFoundPrompt } from './unit_not_found_prompt';
import { useShowClassicTab } from './use_show_classic_tab';
import { rememberClassicTabOrigin } from './use_streams_list_link';
import { useUnitCheck } from './use_unit_check';

const techPreviewBadge = {
  iconType: 'flask',
  tooltip: i18n.translate('xpack.streams.technicalPreviewLabel', {
    defaultMessage: 'Technical preview',
  }),
};

/**
 * Top-level tabbed layout for Streams. It owns the tab bar and delegates each
 * tab's content to the matching entry in the tab registry.
 */
export function StreamsLayout() {
  const {
    path: { unitId, tab },
  } = useStreamsAppParams('/v2/unit/{unitId}/{tab}');
  const router = useStreamsAppRouter();
  const { rangeFrom, rangeTo } = useTimeRange();
  const { access } = useStreamsPrivileges();
  const unitCheck = useUnitCheck(unitId);
  const { loading, showClassic } = useShowClassicTab();

  useEffect(() => {
    rememberClassicTabOrigin(tab === 'classic');
  }, [tab]);

  // Classic stays reachable by URL, so an empty cluster keeps the V1 create and settings controls.
  const classicOpen = tab === 'classic' && access.legacy;
  const visibleTabs = useMemo(
    () => STREAMS_LAYOUT_TABS.filter((tabId) => showClassic || classicOpen || tabId !== 'classic'),
    [showClassic, classicOpen]
  );

  const appHeaderTabs = useMemo<AppHeaderTab[]>(
    () =>
      visibleTabs.map((tabId) => {
        const { label, techPreview } = streamsLayoutTabs[tabId];
        return {
          id: tabId,
          label,
          href: router.link('/v2/unit/{unitId}/{tab}', {
            path: { unitId, tab: tabId },
            query: { rangeFrom, rangeTo },
          }),
          isSelected: tab === tabId,
          'data-test-subj': `streamsLayoutTab-${tabId}`,
          ...(techPreview ? { badge: techPreviewBadge } : {}),
        };
      }),
    [visibleTabs, unitId, tab, router, rangeFrom, rangeTo]
  );

  if (!access.v2) {
    return <RedirectTo path="/" />;
  }

  // Runs before the unit check so a bad tab never shows the unit not-found prompt first.
  if (!isStreamsLayoutTab(tab) || !visibleTabs.includes(tab)) {
    return (
      <RedirectTo
        path="/v2/unit/{unitId}/{tab}"
        params={{ path: { tab: DEFAULT_STREAMS_LAYOUT_TAB } }}
      />
    );
  }

  const { Component, noPadding, ownsHeader } = streamsLayoutTabs[tab];
  if (ownsHeader) {
    return loading ? (
      <StreamsAppPageTemplate.EmptyPrompt
        data-test-subj="streamsClassicTabLoading"
        icon={<EuiLoadingSpinner size="xl" />}
      />
    ) : (
      <Component tabs={appHeaderTabs} />
    );
  }

  const title = i18n.translate('xpack.streams.streamsLayout.pageHeaderTitle', {
    defaultMessage: 'Streams',
  });
  const description = i18n.translate('xpack.streams.streamsLayout.pageHeaderDescription', {
    defaultMessage: 'Route, process, and manage your data streams from source to destination.',
  });

  if (unitCheck !== 'ready') {
    return (
      <>
        <StreamsAppHeader title={title} description={description} />
        {unitCheck === 'checking' ? (
          <StreamsAppPageTemplate.EmptyPrompt
            data-test-subj="streamsUnitCheckLoading"
            icon={<EuiLoadingSpinner size="xl" />}
          />
        ) : (
          <UnitNotFoundPrompt unitId={unitId} />
        )}
      </>
    );
  }

  const body = (
    <StreamsAppPageTemplate.Body noPadding={noPadding} paddingSize="m">
      {/* The tab machines read the unit loader once, so a new unit needs a fresh mount. */}
      <Component key={unitId} />
    </StreamsAppPageTemplate.Body>
  );

  return (
    <>
      <StreamsAppHeader title={title} description={description} tabs={appHeaderTabs} />
      {body}
    </>
  );
}
