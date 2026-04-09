/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useEffect, useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useKibana } from '../../hooks/use_kibana';
import { STREAMS_APP_DEFAULT_TIME_RANGE } from '../../util/constants';

/**
 * Hook to check if time range params are set and provide a redirect function.
 */
function useDateRangeRedirect() {
  const history = useHistory();
  const location = useLocation();
  const {
    dependencies: {
      start: {
        data: { query: queryService },
      },
    },
  } = useKibana();

  // Parse URL params synchronously during render
  const searchParams = new URLSearchParams(location.search);
  const isDateRangeSet = searchParams.has('rangeFrom') && searchParams.has('rangeTo');
  const rangeFrom = searchParams.get('rangeFrom');
  const rangeTo = searchParams.get('rangeTo');

  const redirect = useCallback(() => {
    // Set defaults, preserving any existing params
    const nextParams = new URLSearchParams(location.search);
    nextParams.set('rangeFrom', STREAMS_APP_DEFAULT_TIME_RANGE.from);
    nextParams.set('rangeTo', STREAMS_APP_DEFAULT_TIME_RANGE.to);

    history.replace({
      ...location,
      search: nextParams.toString(),
    });
  }, [history, location]);

  return { isDateRangeSet, rangeFrom, rangeTo, redirect, queryService };
}

/**
 * Component that ensures time range params (rangeFrom/rangeTo) are present in the URL.
 * If they are missing, it blocks rendering and redirects to add default values.
 *
 * When adding defaults, it uses the Streams app default (Last 24 hours: now-24h → now).
 *
 * Also syncs URL time params to the global timefilter on mount and URL changes.
 * This ensures components using useTimefilter() get the correct time from URL.
 *
 * TODO: Ideally all router.link/push calls should pass time params explicitly.
 * See the route definitions in routes/config.tsx for the expected query params.
 */
export function DateRangeRedirect({ children }: { children: React.ReactNode }) {
  const { isDateRangeSet, rangeFrom, rangeTo, redirect, queryService } = useDateRangeRedirect();

  // Use useLayoutEffect to redirect before paint, avoiding the
  // "Cannot update a component while rendering" warning
  useLayoutEffect(() => {
    if (!isDateRangeSet) {
      redirect();
    }
  }, [isDateRangeSet, redirect]);

  useEffect(() => {
    if (rangeFrom && rangeTo) {
      const currentTime = queryService.timefilter.timefilter.getTime();
      if (currentTime.from !== rangeFrom || currentTime.to !== rangeTo) {
        queryService.timefilter.timefilter.setTime({
          from: rangeFrom,
          to: rangeTo,
        });
      }
    }
  }, [rangeFrom, rangeTo, queryService]);

  // Block rendering until time params are set
  if (!isDateRangeSet) {
    return null;
  }

  return <>{children}</>;
}
