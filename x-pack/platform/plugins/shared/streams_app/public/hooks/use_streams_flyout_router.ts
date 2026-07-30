/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useStreamsAppParams } from './use_streams_app_params';
import { useTimeRange } from './use_time_range';
import { useStreamsAppRouter } from './use_streams_app_router';

export function useStreamsFlyoutRouter() {
  const {
    path: { key },
    query: { flyoutTab = 'overview', flyoutName },
  } = useStreamsAppParams('/{key}/management/{tab}');
  const { push, link } = useStreamsAppRouter();
  const { rangeFrom, rangeTo } = useTimeRange();

  const tabLink = useCallback(
    (tabName: string) =>
      link('/{key}/management/{tab}', {
        path: { key, tab: 'canvas' },
        query: { flyoutTab: tabName, flyoutName, rangeFrom, rangeTo },
      }),
    [link, key, rangeFrom, rangeTo, flyoutName]
  );

  const setFlyout = useCallback(
    (name: string | null) => {
      const query = name ? { flyoutName: name, flyoutTab } : {};
      push('/{key}/management/{tab}', {
        path: { key, tab: 'canvas' },
        query: { ...query, rangeFrom, rangeTo },
      });
    },
    [push, key, rangeFrom, rangeTo, flyoutTab]
  );

  return {
    tabLink,
    selectedTab: flyoutTab,
    flyout: flyoutName,
    setFlyout,
  };
}
