/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KpiNetworkData } from '../../../../graphql/types';
import { StatItems } from '../../../stat_items';

export const mockData: { KpiNetwork: KpiNetworkData } = {
  KpiNetwork: {
    networkEvents: 16,
    uniqueFlowId: 10277307,
    uniqueSourcePrivateIps: 383,
    uniqueSourcePrivateIpsHistogram: [
      {
        x: new Date('2019-02-09T16:00:00.000Z').valueOf(),
        y: 8,
      },
      {
        x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
        y: 0,
      },
    ],
    uniqueDestinationPrivateIps: 18,
    uniqueDestinationPrivateIpsHistogram: [
      {
        x: new Date('2019-02-09T16:00:00.000Z').valueOf(),
        y: 8,
      },
      {
        x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
        y: 0,
      },
    ],
    dnsQueries: 278,
    tlsHandshakes: 10000,
  },
};

const mockMappingItems: StatItems = {
  key: 'UniqueIps',
  index: 0,
  fields: [
    {
      key: 'uniqueSourcePrivateIps',
      value: null,
      name: 'Src.',
      description: 'Source',
      color: '#DB1374',
      icon: 'visMapCoordinate',
    },
    {
      key: 'uniqueDestinationPrivateIps',
      value: null,
      name: 'Dest.',
      description: 'Destination',
      color: '#490092',
      icon: 'visMapCoordinate',
    },
  ],
  description: 'Unique Private IPs',
  enableAreaChart: true,
  enableBarChart: true,
  grow: 2,
};

export const mockNoChartMappings: Readonly<StatItems[]> = [
  {
    ...mockMappingItems,
    enableAreaChart: false,
    enableBarChart: false,
  },
];

export const mockDisableChartsInitialData = {
  fields: [
    {
      key: 'uniqueSourcePrivateIps',
      value: undefined,
      name: 'Src.',
      description: 'Source',
      color: '#DB1374',
      icon: 'visMapCoordinate',
    },
    {
      key: 'uniqueDestinationPrivateIps',
      value: undefined,
      name: 'Dest.',
      description: 'Destination',
      color: '#490092',
      icon: 'visMapCoordinate',
    },
  ],
  description: 'Unique Private IPs',
  enableAreaChart: false,
  enableBarChart: false,
  grow: 2,
  areaChart: undefined,
  barChart: undefined,
};

export const mockEnableChartsInitialData = {
  fields: [
    {
      key: 'uniqueSourcePrivateIps',
      value: undefined,
      name: 'Src.',
      description: 'Source',
      color: '#DB1374',
      icon: 'visMapCoordinate',
    },
    {
      key: 'uniqueDestinationPrivateIps',
      value: undefined,
      name: 'Dest.',
      description: 'Destination',
      color: '#490092',
      icon: 'visMapCoordinate',
    },
  ],
  description: 'Unique Private IPs',
  enableAreaChart: true,
  enableBarChart: true,
  grow: 2,
  areaChart: [],
  barChart: [
    {
      color: '#DB1374',
      key: 'uniqueSourcePrivateIps',
      value: [
        {
          g: 'uniqueSourcePrivateIps',
          x: 'Src.',
          y: null,
        },
      ],
    },
    {
      color: '#490092',
      key: 'uniqueDestinationPrivateIps',
      value: [
        {
          g: 'uniqueDestinationPrivateIps',
          x: 'Dest.',
          y: null,
        },
      ],
    },
  ],
};

export const mockEnableChartsData = {
  areaChart: [
    {
      key: 'uniqueSourcePrivateIpsHistogram',
      value: [
        { x: new Date('2019-02-09T16:00:00.000Z').valueOf(), y: 8 },
        {
          x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
          y: 0,
        },
      ],
      name: 'Src.',
      description: 'Source',
      color: '#DB1374',
      icon: 'visMapCoordinate',
    },
    {
      key: 'uniqueDestinationPrivateIpsHistogram',
      value: [
        { x: new Date('2019-02-09T16:00:00.000Z').valueOf(), y: 8 },
        { x: new Date('2019-02-09T19:00:00.000Z').valueOf(), y: 0 },
      ],
      name: 'Dest.',
      description: 'Destination',
      color: '#490092',
      icon: 'visMapCoordinate',
    },
  ],
  barChart: [
    {
      key: 'uniqueSourcePrivateIps',
      color: '#DB1374',
      value: [{ x: 'Src.', y: 383, g: 'uniqueSourcePrivateIps' }],
    },
    {
      key: 'uniqueDestinationPrivateIps',
      color: '#490092',
      value: [{ x: 'Dest.', y: 18, g: 'uniqueDestinationPrivateIps' }],
    },
  ],
  description: 'Unique Private IPs',
  enableAreaChart: true,
  enableBarChart: true,
  fields: [
    {
      key: 'uniqueSourcePrivateIps',
      value: 383,
      name: 'Src.',
      description: 'Source',
      color: '#DB1374',
      icon: 'visMapCoordinate',
    },
    {
      key: 'uniqueDestinationPrivateIps',
      value: 18,
      name: 'Dest.',
      description: 'Destination',
      color: '#490092',
      icon: 'visMapCoordinate',
    },
  ],
  from: 1560578400000,
  grow: 2,
  id: 'statItem',
  index: 4,
  to: 1560837600000,
};
