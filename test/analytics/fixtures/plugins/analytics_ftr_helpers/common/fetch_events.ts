/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  filter,
  firstValueFrom,
  map,
  NEVER,
  type Observable,
  take,
  takeUntil,
  timer,
  toArray,
} from 'rxjs';
import { get } from 'lodash';
import type { Event } from '@kbn/analytics-client';
import type { GetEventsOptions } from './types';

export async function fetchEvents(
  events$: Observable<Event>,
  takeNumberOfEvents: number,
  options: GetEventsOptions = {}
): Promise<Event[]> {
  const { eventTypes = [], withTimeoutMs, fromTimestamp, filters } = options;

  const filteredEvents$ = events$.pipe(
    filter((event) => {
      if (eventTypes.length > 0) {
        return eventTypes.includes(event.event_type);
      }
      return true;
    }),
    filter((event) => {
      if (fromTimestamp) {
        return new Date(event.timestamp).getTime() - new Date(fromTimestamp).getTime() > 0;
      }
      return true;
    }),
    filter((event) => {
      if (filters) {
        return Object.entries(filters).every(([key, comparison]) => {
          const value = get(event, key);
          return Object.entries(comparison).every(([operation, valueToCompare]) => {
            switch (operation) {
              case 'eq':
                return value === valueToCompare;
              case 'gte':
                return value >= (valueToCompare as typeof value);
              case 'gt':
                return value > (valueToCompare as typeof value);
              case 'lte':
                return value <= (valueToCompare as typeof value);
              case 'lt':
                return value < (valueToCompare as typeof value);
            }
          });
        });
      }
      return true;
    })
  );

  return firstValueFrom(
    filteredEvents$.pipe(
      take(takeNumberOfEvents),
      // If timeout is specified, close the subscriber when the timeout occurs
      takeUntil(withTimeoutMs ? timer(withTimeoutMs) : NEVER),
      toArray(),
      // Sorting the events by timestamp... on CI it's happening an event may occur while the client is still forwarding the early ones...
      map((_events) =>
        _events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      )
    )
  );
}
