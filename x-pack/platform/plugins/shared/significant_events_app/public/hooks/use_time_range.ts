/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';

// Default time range (matches Kibana's default)
const DEFAULT_FROM = 'now-15m';
const DEFAULT_TO = 'now';

/**
 * Hook to get the current time range from URL params.
 *
 * Reads from URL search params directly to work across all routes.
 * Time params are defined in route definitions for type-safe navigation,
 * but read universally via URL for flexibility.
 *
 * Assumes DateRangeRedirect has ensured time params are present in the URL.
 */
export function useTimeRange() {
  const location = useLocation();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const rangeFrom = searchParams.get('rangeFrom') ?? DEFAULT_FROM;
  const rangeTo = searchParams.get('rangeTo') ?? DEFAULT_TO;

  // Resolving "now" is memoized on the relative range: without it every render
  // produces new absolute values, which turns them into unstable effect/query
  // dependencies for consumers.
  return useMemo(() => {
    const { from: start, to: end } = getAbsoluteTimeRange(
      { from: rangeFrom, to: rangeTo },
      { forceNow: new Date() }
    );

    return {
      rangeFrom, // Relative: "now-15m"
      rangeTo, // Relative: "now"
      start, // Absolute ISO string: "2024-01-13T10:00:00.000Z"
      end, // Absolute ISO string: "2024-01-13T10:15:00.000Z"
      startMs: new Date(start).getTime(), // Absolute milliseconds
      endMs: new Date(end).getTime(),
    };
  }, [rangeFrom, rangeTo]);
}
