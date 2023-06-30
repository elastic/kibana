/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import lodash from 'lodash';
import type { Moment } from 'moment';

export { template } from './template';

const createGroupIndex = (index: number) => Math.floor(index / 1000) * 1000;

const randomBetween = (start = 0, end = 1, step = 0.1) =>
  lodash.sample(lodash.range(start, end, step));

let networkDataCount = 0;
const generateNetworkData = lodash.memoize(() => {
  networkDataCount += 10000;
  return networkDataCount;
});

export const generateEvent = (index: number, timestamp: Moment, interval: number) => {
  const groupIndex = createGroupIndex(index);
  return [
    {
      '@timestamp': timestamp.toISOString(),
      tags: [`group-${groupIndex}`, `event-${index}`],
      host: {
        name: `host-${index}`,
        mac: ['00-00-5E-00-53-23', '00-00-5E-00-53-24'],
        network: {
          name: `network-${index}`,
        },
      },
      event: {
        module: 'system',
        dataset: 'system.cpu',
      },
      labels: {
        groupId: `group-${groupIndex}`,
        eventId: `event-${index}`,
      },
      system: {
        cpu: {
          cores: 4,
          total: {
            norm: {
              pct: randomBetween(),
            },
          },
          user: {
            pct: randomBetween(1, 4),
          },
          system: {
            pct: randomBetween(1, 4),
          },
        },
      },
      metricset: {
        period: interval,
      },
      container: {
        id: `container-${index}`,
        name: 'container-name',
      },
    },
    {
      '@timestamp': timestamp.toISOString(),
      host: {
        name: `host-${index}`,
        network: {
          name: `network-${index}`,
        },
      },
      event: {
        module: 'system',
        dataset: 'system.network',
      },
      labels: {
        groupId: `group-${groupIndex}`,
        eventId: `event-${index}`,
      },
      system: {
        network: {
          name: 'eth0',
          in: {
            bytes: generateNetworkData(),
          },
          out: {
            bytes: generateNetworkData(),
          },
        },
      },
      metricset: {
        period: interval,
      },
      container: {
        id: `container-${index}`,
        name: 'container-name',
      },
    },
    {
      '@timestamp': timestamp.toISOString(),
      host: {
        name: `host-${index}`,
        network: {
          name: `network-${index}`,
        },
      },
      event: {
        module: 'system',
        dataset: 'system.network',
      },
      labels: {
        groupId: `group-${groupIndex}`,
        eventId: `event-${index}`,
      },
      system: {
        network: {
          name: 'eth1',
          in: {
            bytes: generateNetworkData(),
          },
          out: {
            bytes: generateNetworkData(),
          },
        },
      },
      metricset: {
        period: interval,
      },
      container: {
        id: `container-${index}`,
        name: 'container-name',
      },
    },
  ];
};
