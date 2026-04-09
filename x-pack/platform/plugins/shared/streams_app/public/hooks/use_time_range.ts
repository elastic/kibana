/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation } from 'react-router-dom';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { STREAMS_APP_DEFAULT_TIME_RANGE } from '../util/constants';

const DEFAULT_FROM = STREAMS_APP_DEFAULT_TIME_RANGE.from;
const DEFAULT_TO = STREAMS_APP_DEFAULT_TIME_RANGE.to;

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

  // Convert relative times (e.g., "now-24h") to absolute timestamps
  const { from: start, to: end } = getAbsoluteTimeRange(
    { from: rangeFrom, to: rangeTo },
    { forceNow: new Date() }
  );

  // Also provide numeric timestamps for chart formatters
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();

  return {
    rangeFrom, // Relative: e.g. "now-24h"
    rangeTo, // Relative: "now"
    start, // Absolute ISO string: "2024-01-13T10:00:00.000Z"
    end, // Absolute ISO string: "2024-01-13T10:15:00.000Z"
    startMs, // Absolute milliseconds: 1705140000000
    endMs, // Absolute milliseconds: 1705140900000
  };
}
