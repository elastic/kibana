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
  DEFAULT_NEW_EXPERIENCE_TAB,
  isNewExperienceTab,
  NEW_EXPERIENCE_TABS,
  newExperienceTabs,
} from './tabs';

/**
 * Shell for the new Streams experience. It owns the tabbed layout and delegates
 * each tab's content to the matching entry in the tab registry.
 */
export function StreamsNewExperience() {
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
      NEW_EXPERIENCE_TABS.map((tabId) => ({
        id: tabId,
        label: newExperienceTabs[tabId].label,
        href: router.link('/new-experience/{tab}', {
          path: { tab: tabId },
          query: { rangeFrom, rangeTo },
        }),
        isSelected: tab === tabId,
        'data-test-subj': `streamsNewExperienceTab-${tabId}`,
      })),
    [tab, router, rangeFrom, rangeTo]
  );

  if (!canvas.enabled) {
    return <RedirectTo path="/" />;
  }

  if (!isNewExperienceTab(tab)) {
    return (
      <RedirectTo
        path="/new-experience/{tab}"
        params={{ path: { tab: DEFAULT_NEW_EXPERIENCE_TAB } }}
      />
    );
  }

  const { Component, noPadding } = newExperienceTabs[tab];

  return (
    <>
      <StreamsAppHeader
        title={i18n.translate('xpack.streams.newExperience.pageHeaderTitle', {
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
