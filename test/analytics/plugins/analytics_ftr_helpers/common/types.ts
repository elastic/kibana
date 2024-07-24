/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Event, EventType } from '@elastic/ebt/client';

export type FiltersOptions = {
  [key in 'eq' | 'gte' | 'gt' | 'lte' | 'lt']?: unknown;
};

export interface GetEventsOptions {
  /**
   * eventTypes (optional) array of event types to return
   */
  eventTypes?: EventType[];
  /**
   * withTimeoutMs (optional) if specified, the method returns all the events received when the first occurs:
   * - The number of received events match `takeNumberOfEvents`.
   * - The number of ms in `withTimeoutMs` has elapsed.
   */
  withTimeoutMs?: number;
  /**
   * fromTimestamp (optional) if specified, only the events that are greater than the provided timestamp will be returned.
   * @remarks Useful when we need to retrieve the events after a specific action, and we don't care about anything prior to that.
   */
  fromTimestamp?: string;
  /**
   * List of internal keys to validate in the event with the validation comparison.
   * @example
   * {
   *   filters: {
   *     'properties.my_key': {
   *       eq: 'my expected value',
   *     },
   *   },
   * }
   */
  filters?: Record<string, FiltersOptions>;
}

export interface EBTHelpersContract {
  /**
   * Change the opt-in state of the Kibana EBT client.
   * @param optIn `true` to opt-in, `false` to opt-out.
   */
  setOptIn: (optIn: boolean) => void;
  /**
   * Returns the first N number of events of the specified types.
   * @param takeNumberOfEvents - number of events to return
   * @param options (optional) list of options to filter events or for advanced usage of the API {@link GetEventsOptions}.
   */
  getEvents: (
    takeNumberOfEvents: number,
    options?: GetEventsOptions
  ) => Promise<Array<Event<Record<string, unknown>>>>;
  /**
   * Count the number of events that match the filters.
   * @param options list of options to filter the events {@link GetEventsOptions}. `withTimeoutMs` is required in this API.
   */
  getEventCount: (
    options: Required<Pick<GetEventsOptions, 'withTimeoutMs'>> &
      Omit<GetEventsOptions, 'withTimeoutMs'>
  ) => Promise<number>;
}
