/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Sort significant events for the Significant Events Discovery "Queries" table.
 *
 * Requirement: show non-backed queries first, while keeping the remaining order stable.
 */
export function sortSignificantEventsForQueriesTable<T extends { rule_backed: boolean }>(
  events: readonly T[]
): T[] {
  const unbacked: T[] = [];
  const backed: T[] = [];

  for (const event of events) {
    if (event.rule_backed) {
      backed.push(event);
    } else {
      unbacked.push(event);
    }
  }

  return [...unbacked, ...backed];
}
