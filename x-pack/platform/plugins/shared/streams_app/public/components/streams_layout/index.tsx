/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { useTimeRange } from '../../hooks/use_time_range';
import { RedirectTo } from '../redirect_to';
import { StreamsAppHeader, StreamsAppPageTemplate } from '../streams_app_page_template';
import { StreamsLayoutDefaultTabRedirect } from './default_tab_redirect';
import { StreamCheckLoading } from './stream_check_loading';
import { getStreamsLayoutTabs, isStreamsLayoutTab } from './tab_ids';
import { streamsLayoutTabs } from './tabs';
import { UnitNotFoundPrompt } from './unit_not_found_prompt';
import { useShowClassicTab } from './use_show_classic_tab';
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

  const visibleTabs = useMemo(() => getStreamsLayoutTabs({ showClassic }), [showClassic]);

  const appHeaderTabs = useMemo<AppHeaderTab[]>(
    () =>
      visibleTabs.map((tabId) => {
        const config = streamsLayoutTabs[tabId];
        return {
          id: tabId,
          label: config.label,
          href: router.link('/v2/unit/{unitId}/{tab}', {
            path: { unitId, tab: tabId },
            query: { rangeFrom, rangeTo },
          }),
          isSelected: tab === tabId,
          'data-test-subj': `streamsLayoutTab-${tabId}`,
          ...(!config.ownsHeader && config.techPreview ? { badge: techPreviewBadge } : {}),
        };
      }),
    [visibleTabs, unitId, tab, router, rangeFrom, rangeTo]
  );

  if (!access.v2) {
    return <RedirectTo path="/" />;
  }

  // Runs before the unit check so a bad tab never shows the unit not-found prompt first.
  if (!isStreamsLayoutTab(tab) || !visibleTabs.includes(tab)) {
    return <StreamsLayoutDefaultTabRedirect />;
  }

  const config = streamsLayoutTabs[tab];
  if (config.ownsHeader) {
    if (loading) {
      return <StreamCheckLoading />;
    }
    const { Component: OwnHeaderComponent } = config;
    return <OwnHeaderComponent tabs={appHeaderTabs} />;
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

  const { Component, noPadding } = config;
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
