/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useEffect, useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { useKibana } from '../../hooks/use_kibana';

interface TimePickerTimeDefaults {
  from: string;
  to: string;
}

/**
 * Hook to check if time range params are set and provide a redirect function.
 */
function useDateRangeRedirect() {
  const history = useHistory();
  const location = useLocation();
  const {
    core: { uiSettings },
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
    const timePickerTimeDefaults = uiSettings.get<TimePickerTimeDefaults>(
      UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS
    );
    const timePickerSharedState = queryService.timefilter.timefilter.getTime();

    // Set defaults, preserving any existing params
    const nextParams = new URLSearchParams(location.search);
    nextParams.set('rangeFrom', timePickerSharedState.from ?? timePickerTimeDefaults.from);
    nextParams.set('rangeTo', timePickerSharedState.to ?? timePickerTimeDefaults.to);

    history.replace({
      ...location,
      search: nextParams.toString(),
    });
  }, [history, location, queryService, uiSettings]);

  return { isDateRangeSet, rangeFrom, rangeTo, redirect, queryService };
}

/**
 * Component that ensures time range params (rangeFrom/rangeTo) are present in the URL.
 * If they are missing, it blocks rendering and redirects to add default values.
 *
 * When adding defaults, it reads from the global timefilter first (which retains the
 * last known time within the session), falling back to Kibana's default time settings.
 * This allows navigation links that don't explicitly pass rangeFrom/rangeTo to still
 * preserve the time range within a session.
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
