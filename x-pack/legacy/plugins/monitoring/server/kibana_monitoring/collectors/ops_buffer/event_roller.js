/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, partialRight, assign, max, sum } from 'lodash';
import moment from 'moment';
import v8 from 'v8';
import { mapRequests } from './map_requests';
import { mapResponseTimes } from './map_response_times';

// rollup functions are for objects with unpredictable keys (e.g., {'200': 1, '201': 2} + {'200':2} = {'200': 3, '201': 2})
const maxRollup = partialRight(assign, (latest, prev) => max([latest, prev]));

export class EventRoller {
  constructor() {
    this.rollup = null;
  }

  getFromRollup(path) {
    return get(this.rollup, path);
  }

  hasEvents() {
    return this.rollup !== null;
  }

  rollupEvent(event) {
    const heapStats = v8.getHeapStatistics();
    const requests = mapRequests(event.requests);

    return {
      concurrent_connections: sum([
        event.concurrent_connections,
        this.getFromRollup('concurrent_connections'),
      ]),
      // memory/os stats use the latest event's details
      os: {
        load: {
          '1m': get(event, 'osload[0]'),
          '5m': get(event, 'osload[1]'),
          '15m': get(event, 'osload[2]'),
        },
        memory: {
          total_in_bytes: get(event, 'osmem.total'),
          free_in_bytes: get(event, 'osmem.free'),
          used_in_bytes: get(event, 'osmem.total') - get(event, 'osmem.free'),
        },
        uptime_in_millis: event.osup * 1000, // seconds to milliseconds
      },
      process: {
        event_loop_delay: sum([event.psdelay, this.getFromRollup('process.event_loop_delay')]),
        memory: {
          heap: {
            total_in_bytes: get(event, 'psmem.heapTotal'),
            used_in_bytes: get(event, 'psmem.heapUsed'),
            size_limit: heapStats.heap_size_limit,
          },
          resident_set_size_in_bytes: get(event, 'psmem.rss'),
        },
        uptime_in_millis: event.psup * 1000, // seconds to milliseconds
      },
      requests: {
        disconnects: sum([requests.disconnects, this.getFromRollup('requests.disconnects')]),
        total: sum([requests.total, this.getFromRollup('requests.total')]),
      },
      response_times: maxRollup(
        mapResponseTimes(event.responseTimes),
        this.getFromRollup('response_times')
      ),
      timestamp: moment.utc().toISOString(),
    };
  }

  addEvent(event) {
    // update internal state with new event data
    this.rollup = this.rollupEvent(event);
  }

  flush() {
    // reset the internal state and return it
    const rollup = this.rollup;
    this.rollup = null;
    return rollup;
  }
}
