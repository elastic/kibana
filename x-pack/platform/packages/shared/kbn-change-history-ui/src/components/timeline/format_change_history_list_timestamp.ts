/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Single-line list timestamp, aligned with Security change history (e.g. `Jun 14, 2026 @ 6:42 PM`). */
export const formatChangeHistoryListTimestamp = (date: Date): string => {
  const datePart = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${datePart} @ ${timePart}`;
};

/** Tooltip timestamp with seconds. */
export const formatChangeHistoryListTimestampWithSeconds = (date: Date): string => {
  const timePart = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

  return `${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} @ ${timePart}`;
};
