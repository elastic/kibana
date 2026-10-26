/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineDisplayEvent } from '../../../../services/events';

/**
 * Merges event lists by id, keeping the first copy of each. Pass saved events first: every live
 * event gets a saved twin after the refetch, so the saved copy wins.
 */
export const mergeEventsById = (
  ...lists: Array<TimelineDisplayEvent[]>
): TimelineDisplayEvent[] => {
  const byId = new Map<string, TimelineDisplayEvent>();
  for (const list of lists) {
    for (const event of list) {
      if (!byId.has(event.id)) {
        byId.set(event.id, event);
      }
    }
  }
  return [...byId.values()];
};
