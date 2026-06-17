/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const formatTimestamp = (ms: number, timeZone?: string): string =>
  new Date(ms).toLocaleString(
    i18n.getLocale(),
    timeZone && timeZone !== 'Browser' ? { timeZone } : undefined
  );

/**
 * Human-readable duration from milliseconds (`2h 15m`).
 * Returns `fallback` (default `'0m'`) for non-positive / non-finite input.
 */
export const formatDuration = (ms: number, fallback = '0m'): string => {
  if (!Number.isFinite(ms) || ms <= 0) return fallback;
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};
