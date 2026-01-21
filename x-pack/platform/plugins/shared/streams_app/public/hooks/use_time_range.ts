/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { useStreamsAppParams } from './use_streams_app_params';

// Default time range (matches Kibana's default)
const DEFAULT_FROM = 'now-15m';
const DEFAULT_TO = 'now';

/**
 * Hook to get the current time range from URL params.
 * Assumes DateRangeRedirect has ensured time params are present in the URL.
 */
export function useTimeRange() {
  // Read from URL params via typed router
  // DateRangeRedirect ensures rangeFrom/rangeTo are always present
  const { query } = useStreamsAppParams('/*');

  // Fallback to defaults for TypeScript safety (DateRangeRedirect ensures these exist at runtime)
  const rangeFrom = query?.rangeFrom ?? DEFAULT_FROM;
  const rangeTo = query?.rangeTo ?? DEFAULT_TO;

  // Convert relative times (e.g., "now-15m") to absolute timestamps
  const { from: start, to: end } = getAbsoluteTimeRange(
    { from: rangeFrom, to: rangeTo },
    { forceNow: new Date() }
  );

  // Also provide numeric timestamps for chart formatters
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();

  return {
    rangeFrom, // Relative: "now-15m"
    rangeTo, // Relative: "now"
    start, // Absolute ISO string: "2024-01-13T10:00:00.000Z"
    end, // Absolute ISO string: "2024-01-13T10:15:00.000Z"
    startMs, // Absolute milliseconds: 1705140000000
    endMs, // Absolute milliseconds: 1705140900000
  };
}
