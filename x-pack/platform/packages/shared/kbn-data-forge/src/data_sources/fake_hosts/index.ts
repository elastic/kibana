/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GeneratorFunction } from '../../types';
import { replaceMetricsWithShapes } from '../../lib/replace_metrics_with_shapes';

export { indexTemplate } from './ecs';

const createGroupIndex = (index: number) => Math.floor(index / 1000) * 1000;

const randomBetween = (min = 0, max = 1, step = 1) => {
  const value = Math.random() * (max - min + 1) + min;
  return value - (value % step);
};

const networkDataCount: Record<string, number> = {};
const generateNetworkData = (host: string, name: string, value: number) => {
  const key = `${host}:${name}`;
  if (networkDataCount[key] == null) {
    networkDataCount[key] = 0;
  }
  if (networkDataCount[key] + value > Number.MAX_SAFE_INTEGER) {
    networkDataCount[key] = 0;
  }
  networkDataCount[key] += value;
  return networkDataCount[key];
};

export const generateEvent: GeneratorFunction = (config, schedule, index, timestamp) => {
  const groupIndex = createGroupIndex(index);
  const interval = schedule.interval ?? config.indexing.interval;
  const scenario = config.indexing.scenario || 'fake_hosts';
  const rxBytes = randomBetween(100, 1000, 1);
  const txBytes = randomBetween(100, 1000, 1);
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
              pct: randomBetween(0, 1, 0.01),
            },
          },
          user: {
            pct: randomBetween(1, 4, 0.01),
          },
          system: {
            pct: randomBetween(1, 4, 0.01),
          },
        },
        load: {
          1: randomBetween(1, 4, 0.01),
        },
        memory: {
          actual: {
            used: {
              pct: randomBetween(1, 4, 0.01),
            },
          },
        },
        filesystem: {
          used: {
            pct: randomBetween(1, 4, 0.01),
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
            bytes: rxBytes,
          },
          egress: {
            bytes: txBytes,
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
            bytes: generateNetworkData(`host-${index}`, 'eth0-rx', rxBytes),
          },
          out: {
            bytes: generateNetworkData(`host-${index}`, 'eth0-tx', txBytes),
          },
        },
        core: {
          system: {
            ticks: randomBetween(1_000_000, 1_500_100, 1),
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
            bytes: rxBytes,
          },
          egress: {
            bytes: txBytes,
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
          name: 'eth1',
          in: {
            bytes: generateNetworkData(`host-${index}`, 'eth1-rx', rxBytes),
          },
          out: {
            bytes: generateNetworkData(`host-${index}`, 'eth1-tx', txBytes),
          },
        },
        core: {
          system: {
            ticks: randomBetween(1_000_000, 1_500_100, 1),
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
