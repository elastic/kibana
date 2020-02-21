/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getStatsWithXpack } from './get_stats_with_xpack';

const kibana = {
  kibana: {
    great: 'googlymoogly',
    versions: [{ version: '8675309', count: 1 }],
  },
  kibana_stats: {
    os: {
      platform: 'rocky',
      platformRelease: 'iv',
    },
  },
  localization: {
    locale: 'en',
    labelsCount: 0,
    integrities: {},
  },
  sun: { chances: 5 },
  clouds: { chances: 95 },
  rain: { chances: 2 },
  snow: { chances: 0 },
};

const getMockServer = (getCluster = jest.fn()) => ({
  log(tags: string[], message: string) {
    // eslint-disable-next-line no-console
    console.log({ tags, message });
  },
  config() {
    return {
      get(item: string) {
        switch (item) {
          case 'pkg.version':
            return '8675309-snapshot';
          default:
            throw Error(`unexpected config.get('${item}') received.`);
        }
      },
    };
  },
  plugins: {
    elasticsearch: { getCluster },
  },
});

const mockUsageCollection = (kibanaUsage = kibana) => ({
  bulkFetch: () => kibanaUsage,
  toObject: (data: any) => data,
});

describe('Telemetry Collection: Get Aggregated Stats', () => {
  test('OSS-like telemetry (no license nor X-Pack telemetry)', async () => {
    const callCluster = jest.fn(async (method: string, options: { path?: string }) => {
      switch (method) {
        case 'transport.request':
          if (options.path === '/_license' || options.path === '/_xpack/usage') {
            // eslint-disable-next-line no-throw-literal
            throw { statusCode: 404 };
          }
          return {};
        case 'info':
          return { cluster_uuid: 'test', cluster_name: 'test', version: { number: '8.0.0' } };
        default:
          return {};
      }
    });
    const usageCollection = mockUsageCollection();
    const server = getMockServer();

    const stats = await getStatsWithXpack([{ clusterUuid: '1234' }], {
      callCluster,
      usageCollection,
      server,
    } as any);
    expect(stats.map(({ timestamp, ...rest }) => rest)).toMatchSnapshot();
  });

  test('X-Pack telemetry (license + X-Pack)', async () => {
    const callCluster = jest.fn(async (method: string, options: { path?: string }) => {
      switch (method) {
        case 'transport.request':
          if (options.path === '/_license') {
            return {
              license: { type: 'basic' },
            };
          }
          if (options.path === '/_xpack/usage') {
            return {};
          }
        case 'info':
          return { cluster_uuid: 'test', cluster_name: 'test', version: { number: '8.0.0' } };
        default:
          return {};
      }
    });
    const usageCollection = mockUsageCollection();
    const server = getMockServer();

    const stats = await getStatsWithXpack([{ clusterUuid: '1234' }], {
      callCluster,
      usageCollection,
      server,
    } as any);
    expect(stats.map(({ timestamp, ...rest }) => rest)).toMatchSnapshot();
  });
});
