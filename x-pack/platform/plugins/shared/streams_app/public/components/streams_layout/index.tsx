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
import {
  DEFAULT_STREAMS_LAYOUT_TAB,
  isStreamsLayoutTab,
  STREAMS_LAYOUT_TABS,
  streamsLayoutTabs,
} from './tabs';
import { UnitNotFoundPrompt } from './unit_not_found_prompt';
import { useUnitCheck } from './use_unit_check';

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

  const appHeaderTabs = useMemo<AppHeaderTab[]>(
    () =>
      STREAMS_LAYOUT_TABS.map((tabId) => ({
        id: tabId,
        label: streamsLayoutTabs[tabId].label,
        href: router.link('/v2/unit/{unitId}/{tab}', {
          path: { unitId, tab: tabId },
          query: { rangeFrom, rangeTo },
        }),
        isSelected: tab === tabId,
        'data-test-subj': `streamsLayoutTab-${tabId}`,
      })),
    [unitId, tab, router, rangeFrom, rangeTo]
  );

  if (!access.v2) {
    return <RedirectTo path="/" />;
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

  if (!isStreamsLayoutTab(tab)) {
    return (
      <RedirectTo
        path="/v2/unit/{unitId}/{tab}"
        params={{ path: { tab: DEFAULT_STREAMS_LAYOUT_TAB } }}
      />
    );
  }

  const { Component, noPadding } = streamsLayoutTabs[tab];
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
