/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StatItems, KpiValue } from '.';
import { KpiNetworkData } from '../../graphql/types';

export const mockRenderer = (value: KpiValue) => value;

export const mockMappings: Readonly<Array<StatItems<KpiValue>>> = [
  {
    key: 'UniqueIps',
    fields: [
      {
        key: 'uniqueSourcePrivateIps',
        value: null,
        name: 'Src.',
        description: 'Source',
        color: '#DB1374',
        icon: 'visMapCoordinate',
        render: mockRenderer,
      },
      {
        key: 'uniqueDestinationPrivateIps',
        value: null,
        name: 'Dest.',
        description: 'Destination',
        color: '#490092',
        icon: 'visMapCoordinate',
        render: mockRenderer,
      },
    ],
    description: 'Unique Private IPs',
    enableAreaChart: true,
    enableBarChart: true,
    grow: 2,
  },
];

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

export const mockEnableChartsData = {
  fields: [
    {
      key: 'uniqueSourcePrivateIps',
      value: 383,
      name: 'Src.',
      description: 'Source',
      color: '#DB1374',
      icon: 'visMapCoordinate',
      render: mockRenderer,
    },
    {
      key: 'uniqueDestinationPrivateIps',
      value: 18,
      name: 'Dest.',
      description: 'Destination',
      color: '#490092',
      icon: 'visMapCoordinate',
      render: mockRenderer,
    },
  ],
  description: 'Unique Private IPs',
  enableAreaChart: true,
  enableBarChart: true,
  grow: 2,
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
};

const mockMappingItems: Readonly<StatItems<KpiValue>> = {
  key: 'UniqueIps',
  fields: [
    {
      key: 'uniqueSourcePrivateIps',
      value: null,
      name: 'Src.',
      description: 'Source',
      color: '#DB1374',
      icon: 'visMapCoordinate',
      render: mockRenderer,
    },
    {
      key: 'uniqueDestinationPrivateIps',
      value: null,
      name: 'Dest.',
      description: 'Destination',
      color: '#490092',
      icon: 'visMapCoordinate',
      render: mockRenderer,
    },
  ],
  description: 'Unique Private IPs',
  enableAreaChart: true,
  enableBarChart: true,
  grow: 2,
};

export const mockNoChartMappings: Readonly<Array<StatItems<KpiValue>>> = [
  {
    ...mockMappingItems,
    enableAreaChart: false,
    enableBarChart: false,
  },
];
