/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSpacesUsageCollector, UsageStats } from './get_spaces_usage_collector';

function getServerMock(customization?: any) {
  class MockUsageCollector {
    private fetch: any;

    constructor(server: any, { fetch }: any) {
      this.fetch = fetch;
    }
    // to make typescript happy
    public fakeFetchUsage() {
      return this.fetch;
    }
  }

  const getLicenseCheckResults = jest.fn().mockReturnValue({});
  const defaultServerMock = {
    plugins: {
      xpack_main: {
        info: {
          isAvailable: jest.fn().mockReturnValue(true),
          feature: () => ({
            getLicenseCheckResults,
          }),
          license: {
            isOneOf: jest.fn().mockReturnValue(false),
            getType: jest.fn().mockReturnValue('platinum'),
          },
          toJSON: () => ({ b: 1 }),
        },
        getFeatures: jest.fn().mockReturnValue([{ id: 'feature1' }, { id: 'feature2' }]),
      },
    },
    expose: () => {
      return;
    },
    log: () => {
      return;
    },
    usage: {
      collectorSet: {
        makeUsageCollector: (options: any) => {
          return new MockUsageCollector(defaultServerMock, options);
        },
      },
    },
  };
  return Object.assign(defaultServerMock, customization);
}

const defaultCallClusterMock = jest.fn().mockResolvedValue({
  hits: {
    total: {
      value: 2,
    },
  },
  aggregations: {
    disabledFeatures: {
      buckets: [
        {
          key: 'feature1',
          doc_count: 1,
        },
      ],
    },
  },
});

describe('with a basic license', () => {
  let serverWithBasicLicenseMock: any;
  let usageStats: UsageStats;
  beforeAll(async () => {
    serverWithBasicLicenseMock = getServerMock();
    serverWithBasicLicenseMock.plugins.xpack_main.info.license.getType = jest
      .fn()
      .mockReturnValue('basic');
    const { fetch: getSpacesUsage } = getSpacesUsageCollector({
      kibanaIndex: '.kibana',
      usage: serverWithBasicLicenseMock.usage,
      xpackMain: serverWithBasicLicenseMock.plugins.xpack_main,
    });
    usageStats = await getSpacesUsage(defaultCallClusterMock);
  });

  test('sets enabled to true', () => {
    expect(usageStats.enabled).toBe(true);
  });

  test('sets available to true', () => {
    expect(usageStats.available).toBe(true);
  });

  test('sets the number of spaces', () => {
    expect(usageStats.count).toBe(2);
  });

  test('calculates feature control usage', () => {
    expect(usageStats.usesFeatureControls).toBe(true);
    expect(usageStats).toHaveProperty('disabledFeatures');
    expect(usageStats.disabledFeatures).toEqual({
      feature1: 1,
      feature2: 0,
    });
  });
});

describe('with no license', () => {
  let usageStats: UsageStats;
  beforeAll(async () => {
    const serverWithNoLicenseMock = getServerMock();
    serverWithNoLicenseMock.plugins.xpack_main.info.isAvailable = jest.fn().mockReturnValue(false);

    const { fetch: getSpacesUsage } = getSpacesUsageCollector({
      kibanaIndex: '.kibana',
      usage: serverWithNoLicenseMock.usage,
      xpackMain: serverWithNoLicenseMock.plugins.xpack_main,
    });
    usageStats = await getSpacesUsage(defaultCallClusterMock);
  });

  test('sets enabled to false', () => {
    expect(usageStats.enabled).toBe(false);
  });

  test('sets available to false', () => {
    expect(usageStats.available).toBe(false);
  });

  test('does not set the number of spaces', () => {
    expect(usageStats.count).toBeUndefined();
  });

  test('does not set feature control usage', () => {
    expect(usageStats.usesFeatureControls).toBeUndefined();
  });
});

describe('with platinum license', () => {
  let serverWithPlatinumLicenseMock: any;
  let usageStats: UsageStats;
  beforeAll(async () => {
    serverWithPlatinumLicenseMock = getServerMock();
    serverWithPlatinumLicenseMock.plugins.xpack_main.info.license.getType = jest
      .fn()
      .mockReturnValue('platinum');
    const { fetch: getSpacesUsage } = getSpacesUsageCollector({
      kibanaIndex: '.kibana',
      usage: serverWithPlatinumLicenseMock.usage,
      xpackMain: serverWithPlatinumLicenseMock.plugins.xpack_main,
    });
    usageStats = await getSpacesUsage(defaultCallClusterMock);
  });

  test('sets enabled to true', () => {
    expect(usageStats.enabled).toBe(true);
  });

  test('sets available to true', () => {
    expect(usageStats.available).toBe(true);
  });

  test('sets the number of spaces', () => {
    expect(usageStats.count).toBe(2);
  });

  test('calculates feature control usage', () => {
    expect(usageStats.usesFeatureControls).toBe(true);
    expect(usageStats.disabledFeatures).toEqual({
      feature1: 1,
      feature2: 0,
    });
  });
});
