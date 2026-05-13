/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_LAST_OCCURRED_AT = '--';

interface OccurrencePoint {
  x: number;
  y: number;
}

export function formatLastOccurredAt(
  occurrences: OccurrencePoint[],
  fallbackValue: string = DEFAULT_LAST_OCCURRED_AT
) {
  const lastOccurrence = occurrences.findLast((occurrence) => occurrence.y !== 0);
  if (!lastOccurrence) {
    return fallbackValue;
  }

  const date = new Date(lastOccurrence.x);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return `${formattedDate} @ ${formattedTime}`;
}
