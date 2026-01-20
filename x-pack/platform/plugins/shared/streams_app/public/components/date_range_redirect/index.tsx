/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useCallback } from 'react';
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

  return { isDateRangeSet, redirect };
}

/**
 * Component that ensures time range params (rangeFrom/rangeTo) are present in the URL.
 * If they are missing, it blocks rendering and redirects to add default values.
 */
export function DateRangeRedirect({ children }: { children: React.ReactNode }) {
  const { isDateRangeSet, redirect } = useDateRangeRedirect();

  // Use useLayoutEffect to redirect before paint, avoiding the
  // "Cannot update a component while rendering" warning
  useLayoutEffect(() => {
    if (!isDateRangeSet) {
      redirect();
    }
  }, [isDateRangeSet, redirect]);

  // Block rendering until time params are set
  if (!isDateRangeSet) {
    return null;
  }

  return <>{children}</>;
}
