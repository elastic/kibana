/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventRoller } from '../event_roller';
import expect from '@kbn/expect';

const events = [
  {
    requests: {
      '5601': {
        total: 103,
        disconnects: 0,
        statusCodes: { '200': 15, '304': 88 }
      }
    },
    responseTimes: { '5601': { avg: 5.213592233009709, max: 36 } },
    osload: [1.90380859375, 1.84033203125, 1.82666015625],
    osmem: { total: 17179869184, free: 613638144 },
    osup: 4615,
    psup: 62.388,
    psmem: {
      rss: 518164480,
      heapTotal: 474275840,
      heapUsed: 318428400,
      external: 5172252
    },
    concurrent_connections: 6,
    psdelay: 0.4091129992157221
  },
  {
    requests: {
      '5601': {
        total: 35,
        disconnects: 0,
        statusCodes: { '200': 5, '304': 30 }
      }
    },
    responseTimes: { '5601': { avg: 4.6, max: 29 } },
    sockets: {
      http: { total: 1, '169.254.169.254:80:': 1 },
      https: { total: 0 }
    },
    osload: [1.9111328125, 1.8427734375, 1.82763671875],
    osmem: { total: 17179869184, free: 641744896 },
    osup: 4620,
    psup: 67.39,
    psmem: {
      rss: 518193152,
      heapTotal: 474275840,
      heapUsed: 315669840,
      external: 5083177
    },
    concurrent_connections: 6,
    psdelay: 0.6715770000591874
  }
];

describe('Event Roller', () => {
  it('constructs an event roller object', () => {
    const eventRoller = new EventRoller();
    expect(eventRoller.rollup).to.be(null);
    expect(eventRoller.getFromRollup()).to.be(undefined);
    expect(eventRoller.getFromRollup('concurrent_connections')).to.be(undefined);
  });

  it('adds events and rolls them up', () => {
    const eventRoller = new EventRoller();
    const [ event1, event2 ] = events;
    eventRoller.addEvent(event1);
    eventRoller.addEvent(event2);

    const flush = eventRoller.flush();
    // delete unpredictable fields
    delete flush.timestamp;
    delete flush.process.memory.heap.size_limit;

    expect(flush).to.eql({
      concurrent_connections: 12, // 6 + 6
      os: {
        load: { '1m': 1.9111328125, '5m': 1.8427734375, '15m': 1.82763671875 }, // just the latest
        memory: {
          total_in_bytes: 17179869184,
          free_in_bytes: 641744896,
          used_in_bytes: 16538124288 // just the latest
        },
        uptime_in_millis: 4620000 // converted from latest osup
      },
      process: {
        event_loop_delay: 1.0806899992749095, // 0.4091129992157221 + 0.6715770000591874
        memory: {
          heap: {
            total_in_bytes: 474275840,
            used_in_bytes: 315669840
          },
          resident_set_size_in_bytes: 518193152 // just the latest
        },
        uptime_in_millis: 67390 // latest from psup
      },
      requests: {
        disconnects: 0,
        total: 138, // 103 + 35
      },
      response_times: {
        average: 5.213592233009709, // max of 5.213592233009709, 4.6
        max: 36 // max of 36, 29
      }
    });
  });

  it('forgets the rollup after flush', () => {
    const eventRoller = new EventRoller();
    const [ event1, event2 ] = events;
    eventRoller.addEvent(event1);
    eventRoller.addEvent(event2);

    const flush1 = eventRoller.flush(); // eslint-disable-line no-unused-vars
    const flush2 = eventRoller.flush();

    expect(flush2).to.be(null);
  });
});
