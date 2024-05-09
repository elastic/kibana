/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';
import { sample, range, memoize } from 'lodash';
import { GeneratorFunction } from '../../types';
import { replaceMetricsWithShapes } from '../../lib/replace_metrics_with_shapes';

export { indexTemplate } from './ecs';

const createGroupIndex = (index: number) => Math.floor(index / 1000) * 1000;

const randomBetween = (start = 0, end = 1, step = 0.1) => sample(range(start, end, step));

let networkDataCount = 0;
const generateNetworkData = memoize((_timestamp: string) => {
  networkDataCount += Math.floor(10000 * Math.random());
  return networkDataCount;
});

export const generateEvent: GeneratorFunction = (config, schedule, index, timestamp) => {
  const groupIndex = createGroupIndex(index);
  const interval = schedule.interval ?? config.indexing.interval;
  const scenario = config.indexing.scenario || 'fake_hosts';
  const docs = [
    {
      namespace: 'fake_hosts',
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
        scenario,
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
        load: {
          1: randomBetween(1, 4),
        },
        memory: {
          actual: {
            used: {
              pct: randomBetween(1, 4),
            },
          },
        },
        filesystem: {
          used: {
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
      namespace: 'fake_hosts',
      '@timestamp': timestamp.toISOString(),
      host: {
        name: `host-${index}`,
        mac: ['00-00-5E-00-53-23', '00-00-5E-00-53-24'],
        network: {
          name: `network-${index}`,
          ingress: {
            bytes: parseInt(faker.string.numeric(3), 10),
          },
          egress: {
            bytes: parseInt(faker.string.numeric(3), 10),
          },
        },
      },
      event: {
        module: 'system',
        dataset: 'system.network',
      },
      labels: {
        groupId: `group-${groupIndex}`,
        eventId: `event-${index}`,
        scenario,
      },
      system: {
        network: {
          name: 'eth0',
          in: {
            bytes: generateNetworkData(timestamp.toISOString()),
          },
          out: {
            bytes: generateNetworkData(timestamp.toISOString()),
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
      namespace: 'fake_hosts',
      '@timestamp': timestamp.toISOString(),
      host: {
        name: `host-${index}`,
        mac: ['00-00-5E-00-53-23', '00-00-5E-00-53-24'],
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
        scenario,
      },
      system: {
        network: {
          name: 'eth1',
          in: {
            bytes: generateNetworkData(timestamp.toISOString()),
          },
          out: {
            bytes: generateNetworkData(timestamp.toISOString()),
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
  return replaceMetricsWithShapes(timestamp, schedule, docs);
};
