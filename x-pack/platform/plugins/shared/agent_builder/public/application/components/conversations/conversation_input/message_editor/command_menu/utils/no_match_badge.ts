/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommandId, CommandBadgeData } from '../types';

/** `query` up to its first space starting from `fromIndex`, or the whole query if there is none. */
export const capAtFirstSpace = (query: string, fromIndex = 0): string => {
  const spaceIndex = query.indexOf(' ', fromIndex);
  return spaceIndex === -1 ? query : query.slice(0, spaceIndex);
};

/** Badge selection for an unresolved mention — the `matched: false` counterpart to a normal onSelect. */
export const buildNoMatchSelection = (
  commandId: CommandId,
  consumedQuery: string
): CommandBadgeData => ({
  commandId,
  label: consumedQuery,
  id: '',
  metadata: {},
  matched: false,
  consumedLength: consumedQuery.length,
});
