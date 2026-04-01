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

  // DateRangeRedirect ensures rangeFrom/rangeTo are always present
  const searchParams = new URLSearchParams(location.search);
  const rangeFrom = searchParams.get('rangeFrom') ?? DEFAULT_FROM;
  const rangeTo = searchParams.get('rangeTo') ?? DEFAULT_TO;

  // Convert relative times (e.g., "now-15m") to absolute timestamps.
  // Memoized so that `startMs`/`endMs` remain stable across renders when the
  // URL params haven't changed, preventing downstream effects from re-firing.
  const { start, end, startMs, endMs } = useMemo(() => {
    const { from: absFrom, to: absTo } = getAbsoluteTimeRange(
      { from: rangeFrom, to: rangeTo },
      { forceNow: new Date() }
    );
    return {
      start: absFrom,
      end: absTo,
      startMs: new Date(absFrom).getTime(),
      endMs: new Date(absTo).getTime(),
    };
  }, [rangeFrom, rangeTo]);

  return {
    rangeFrom, // Relative: "now-15m"
    rangeTo, // Relative: "now"
    start, // Absolute ISO string: "2024-01-13T10:00:00.000Z"
    end, // Absolute ISO string: "2024-01-13T10:15:00.000Z"
    startMs, // Absolute milliseconds: 1705140000000
    endMs, // Absolute milliseconds: 1705140900000
  };
}
