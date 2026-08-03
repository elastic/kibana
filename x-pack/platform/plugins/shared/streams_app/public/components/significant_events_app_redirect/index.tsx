/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect } from 'react';
import type {
  SignificantEventsAppLocatorParams,
  SignificantEventsAppTab,
} from '@kbn/significant-events-app-plugin/common';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { useSignificantEventsApp } from '../../hooks/use_significant_events_app';
import { RedirectTo } from '../redirect_to';

/**
 * Redirects into the significant_events app via its locator.
 *
 * On `/_discovery` / `/_discovery/{tab}` the tab and query come from the
 * streams router. Callers can pass locator params (e.g. `tab`, `stream`) to
 * override or supply values when used outside those routes.
 */
export function SignificantEventsAppRedirect(overrides: SignificantEventsAppLocatorParams = {}) {
  const { significantEventsApp, isAvailable, isLoading } = useSignificantEventsApp();
  const discoveryParams = useStreamsAppParams('/_discovery/{tab}', true);
  const { query: currentQuery } = useStreamsAppParams('/*');

  useLayoutEffect(() => {
    if (isLoading || !isAvailable || !significantEventsApp) {
      return;
    }

    void significantEventsApp.locator.navigate(
      {
        ...currentQuery,
        ...discoveryParams?.query,
        tab: discoveryParams?.path?.tab as SignificantEventsAppTab | undefined,
        ...overrides,
      },
      { replace: true }
    );
    // Wait for availability, then navigate once with params from that render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAvailable, significantEventsApp]);

  if (isLoading) {
    return null;
  }

  if (!isAvailable) {
    return <RedirectTo path="/" />;
  }

  return null;
}
