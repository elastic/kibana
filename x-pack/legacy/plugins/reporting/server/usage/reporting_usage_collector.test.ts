/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { createMockReportingCore } from '../../test_helpers';
import { getExportTypesRegistry } from '../lib/export_types_registry';
import {
  registerReportingUsageCollector,
  getReportingUsageCollector,
} from './reporting_usage_collector';
import { ReportingConfig } from '../types';
import { SearchResponse } from './types';

const exportTypesRegistry = getExportTypesRegistry();

function getMockUsageCollection() {
  class MockUsageCollector {
    // @ts-ignore fetch is not used
    private fetch: any;
    constructor(_server: any, { fetch }: any) {
      this.fetch = fetch;
    }
  }
  return {
    makeUsageCollector: (options: any) => {
      return new MockUsageCollector(null, options);
    },
    registerCollector: sinon.stub(),
  };
}

function getPluginsMock(
  { license, usageCollection = getMockUsageCollection() } = { license: 'platinum' }
) {
  const mockXpackMain = {
    info: {
      isAvailable: sinon.stub().returns(true),
      feature: () => ({
        getLicenseCheckResults: sinon.stub(),
      }),
      license: {
        isOneOf: sinon.stub().returns(false),
        getType: sinon.stub().returns(license),
      },
      toJSON: () => ({ b: 1 }),
    },
  };
  return {
    usageCollection,
    __LEGACY: {
      plugins: {
        xpack_main: mockXpackMain,
      },
    },
  } as any;
}

const getMockReportingConfig = () => ({
  get: () => {},
  kbnConfig: { get: () => '' },
});
const getResponseMock = (base = {}) => base;

describe('license checks', () => {
  let mockConfig: ReportingConfig;
  beforeAll(async () => {
    mockConfig = getMockReportingConfig();
  });

  describe('with a basic license', () => {
    let usageStats: any;
    beforeAll(async () => {
      const plugins = getPluginsMock({ license: 'basic' });
      const callClusterMock = jest.fn(() => Promise.resolve(getResponseMock()));
      const { fetch } = getReportingUsageCollector(
        mockConfig,
        plugins.usageCollection,
        plugins.__LEGACY.plugins.xpack_main.info,
        exportTypesRegistry,
        function isReady() {
          return Promise.resolve(true);
        }
      );
      usageStats = await fetch(callClusterMock as any);
    });

    test('sets enables to true', async () => {
      expect(usageStats.enabled).toBe(true);
    });

    test('sets csv available to true', async () => {
      expect(usageStats.csv.available).toBe(true);
    });

    test('sets pdf availability to false', async () => {
      expect(usageStats.printable_pdf.available).toBe(false);
    });
  });

  describe('with no license', () => {
    let usageStats: any;
    beforeAll(async () => {
      const plugins = getPluginsMock({ license: 'none' });
      const callClusterMock = jest.fn(() => Promise.resolve(getResponseMock()));
      const { fetch } = getReportingUsageCollector(
        mockConfig,
        plugins.usageCollection,
        plugins.__LEGACY.plugins.xpack_main.info,
        exportTypesRegistry,
        function isReady() {
          return Promise.resolve(true);
        }
      );
      usageStats = await fetch(callClusterMock as any);
    });

    test('sets enables to true', async () => {
      expect(usageStats.enabled).toBe(true);
    });

    test('sets csv available to false', async () => {
      expect(usageStats.csv.available).toBe(false);
    });

    test('sets pdf availability to false', async () => {
      expect(usageStats.printable_pdf.available).toBe(false);
    });
  });

  describe('with platinum license', () => {
    let usageStats: any;
    beforeAll(async () => {
      const plugins = getPluginsMock({ license: 'platinum' });
      const callClusterMock = jest.fn(() => Promise.resolve(getResponseMock()));
      const { fetch } = getReportingUsageCollector(
        mockConfig,
        plugins.usageCollection,
        plugins.__LEGACY.plugins.xpack_main.info,
        exportTypesRegistry,
        function isReady() {
          return Promise.resolve(true);
        }
      );
      usageStats = await fetch(callClusterMock as any);
    });

    test('sets enables to true', async () => {
      expect(usageStats.enabled).toBe(true);
    });

    test('sets csv available to true', async () => {
      expect(usageStats.csv.available).toBe(true);
    });

    test('sets pdf availability to true', async () => {
      expect(usageStats.printable_pdf.available).toBe(true);
    });
  });

  describe('with no usage data', () => {
    let usageStats: any;
    beforeAll(async () => {
      const plugins = getPluginsMock({ license: 'basic' });
      const callClusterMock = jest.fn(() => Promise.resolve({}));
      const { fetch } = getReportingUsageCollector(
        mockConfig,
        plugins.usageCollection,
        plugins.__LEGACY.plugins.xpack_main.info,
        exportTypesRegistry,
        function isReady() {
          return Promise.resolve(true);
        }
      );
      usageStats = await fetch(callClusterMock as any);
    });

    test('sets enables to true', async () => {
      expect(usageStats.enabled).toBe(true);
    });

    test('sets csv available to true', async () => {
      expect(usageStats.csv.available).toBe(true);
    });
  });
});

describe('data modeling', () => {
  test('with normal looking usage data', async () => {
    const mockConfig = getMockReportingConfig();
    const plugins = getPluginsMock();
    const { fetch } = getReportingUsageCollector(
      mockConfig,
      plugins.usageCollection,
      plugins.__LEGACY.plugins.xpack_main.info,
      exportTypesRegistry,
      function isReady() {
        return Promise.resolve(true);
      }
    );
    const callClusterMock = jest.fn(() =>
      Promise.resolve(
        getResponseMock({
          aggregations: {
            ranges: {
              buckets: {
                all: { doc_count: 40, layoutTypes: { doc_count: 15, pdf: { buckets: [{ key: 'preserve_layout', doc_count: 15 }] }, }, statusByApp: { buckets: [ { key: 'completed', doc_count: 34, appNames: { buckets: [ { key: 'visualization', doc_count: 21, jobType: { buckets: [ { key: 'PNG', doc_count: 16 }, { key: 'printable_pdf', doc_count: 5 }, ], }, }, { key: 'canvas workpad', doc_count: 9, jobType: { buckets: [{ key: 'printable_pdf', doc_count: 9 }] }, }, { key: 'dashboard', doc_count: 4, jobType: { buckets: [{ key: 'PNG', doc_count: 4 }] }, }, ], }, }, { key: 'completed_with_warnings', doc_count: 3, appNames: { buckets: [ { key: 'dashboard', doc_count: 2, jobType: { buckets: [{ key: 'PNG', doc_count: 2 }] }, }, { key: 'canvas workpad', doc_count: 1, jobType: { buckets: [{ key: 'printable_pdf', doc_count: 1 }] }, }, ], }, }, { key: 'failed', doc_count: 3, appNames: { buckets: [ { key: 'visualization', doc_count: 3, jobType: { buckets: [{ key: 'PNG', doc_count: 3 }] }, }, ], }, }, ], }, objectTypes: { doc_count: 15, pdf: { buckets: [ { key: 'canvas workpad', doc_count: 10 }, { key: 'visualization', doc_count: 5 }, ], }, }, statusTypes: { buckets: [ { key: 'completed', doc_count: 34 }, { key: 'completed_with_warnings', doc_count: 3 }, { key: 'failed', doc_count: 3 }, ], }, jobTypes: { buckets: [ { key: 'PNG', doc_count: 25 }, { key: 'printable_pdf', doc_count: 15 }, ], }, },
                last7Days: { doc_count: 15, layoutTypes: { doc_count: 9, pdf: { buckets: [{ key: 'preserve_layout', doc_count: 9 }] }, }, statusByApp: { buckets: [ { key: 'completed', doc_count: 12, appNames: { buckets: [ { key: 'canvas workpad', doc_count: 7, jobType: { buckets: [{ key: 'printable_pdf', doc_count: 7 }] }, }, { key: 'dashboard', doc_count: 4, jobType: { buckets: [{ key: 'PNG', doc_count: 4 }] }, }, { key: 'visualization', doc_count: 1, jobType: { buckets: [{ key: 'printable_pdf', doc_count: 1 }] }, }, ], }, }, { key: 'completed_with_warnings', doc_count: 3, appNames: { buckets: [ { key: 'dashboard', doc_count: 2, jobType: { buckets: [{ key: 'PNG', doc_count: 2 }] }, }, { key: 'canvas workpad', doc_count: 1, jobType: { buckets: [{ key: 'printable_pdf', doc_count: 1 }] }, }, ], }, }, ], }, objectTypes: { doc_count: 9, pdf: { buckets: [ { key: 'canvas workpad', doc_count: 8 }, { key: 'visualization', doc_count: 1 }, ], }, }, statusTypes: { buckets: [ { key: 'completed', doc_count: 12 }, { key: 'completed_with_warnings', doc_count: 3 }, ], }, jobTypes: { buckets: [ { key: 'printable_pdf', doc_count: 9 }, { key: 'PNG', doc_count: 6 }, ], }, },
                lastDay: { doc_count: 7, layoutTypes: { doc_count: 1, pdf: { buckets: [{ key: 'preserve_layout', doc_count: 1 }] }, }, statusByApp: { buckets: [ { key: 'completed', doc_count: 5, appNames: { buckets: [ { key: 'dashboard', doc_count: 4, jobType: { buckets: [{ key: 'PNG', doc_count: 4 }] }, }, { key: 'visualization', doc_count: 1, jobType: { buckets: [{ key: 'printable_pdf', doc_count: 1 }] }, }, ], }, }, { key: 'completed_with_warnings', doc_count: 2, appNames: { buckets: [ { key: 'dashboard', doc_count: 2, jobType: { buckets: [{ key: 'PNG', doc_count: 2 }] }, }, ], }, }, ], }, objectTypes: { doc_count: 1, pdf: { buckets: [{ key: 'visualization', doc_count: 1 }] }, }, statusTypes: { buckets: [ { key: 'completed', doc_count: 5 }, { key: 'completed_with_warnings', doc_count: 2 }, ], }, jobTypes: { buckets: [ { key: 'PNG', doc_count: 6 }, { key: 'printable_pdf', doc_count: 1 }, ], }, },
              },
            },
          },
        } as SearchResponse) // prettier-ignore
      )
    );

    const usageStats = await fetch(callClusterMock as any);
    expect(usageStats).toMatchSnapshot();
  });

  test('with sparse data', async () => {
    const mockConfig = getMockReportingConfig();
    const plugins = getPluginsMock();
    const { fetch } = getReportingUsageCollector(
      mockConfig,
      plugins.usageCollection,
      plugins.__LEGACY.plugins.xpack_main.info,
      exportTypesRegistry,
      function isReady() {
        return Promise.resolve(true);
      }
    );
    const callClusterMock = jest.fn(() =>
      Promise.resolve(
        getResponseMock({
          aggregations: {
            ranges: {
              buckets: {
                all: { doc_count: 1, jobTypes: { buckets: [ { doc_count: 1, key: 'csv', }, ], }, layoutTypes: { doc_count: 0, pdf: { buckets: [], }, }, objectTypes: { doc_count: 0, pdf: { buckets: [], }, }, statusByApp: { buckets: [ { appNames: { buckets: [], }, doc_count: 1, key: 'completed', }, ], }, statusTypes: { buckets: [ { doc_count: 1, key: 'completed', }, ], }, },
                last7Days: { doc_count: 1, jobTypes: { buckets: [ { doc_count: 1, key: 'csv', }, ], }, layoutTypes: { doc_count: 0, pdf: { buckets: [], }, }, objectTypes: { doc_count: 0, pdf: { buckets: [], }, }, statusByApp: { buckets: [ { appNames: { buckets: [], }, doc_count: 1, key: 'completed', }, ], }, statusTypes: { buckets: [ { doc_count: 1, key: 'completed', }, ], }, },
                lastDay: { doc_count: 1, jobTypes: { buckets: [ { doc_count: 1, key: 'csv', }, ], }, layoutTypes: { doc_count: 0, pdf: { buckets: [], }, }, objectTypes: { doc_count: 0, pdf: { buckets: [], }, }, statusByApp: { buckets: [ { appNames: { buckets: [], }, doc_count: 1, key: 'completed', }, ], }, statusTypes: { buckets: [ { doc_count: 1, key: 'completed', }, ], }, },
              },
            },
          },
        } as SearchResponse) // prettier-ignore
      )
    );

    const usageStats = await fetch(callClusterMock as any);
    expect(usageStats).toMatchSnapshot();
  });

  test('with empty data', async () => {
    const mockConfig = getMockReportingConfig();
    const plugins = getPluginsMock();
    const { fetch } = getReportingUsageCollector(
      mockConfig,
      plugins.usageCollection,
      plugins.__LEGACY.plugins.xpack_main.info,
      exportTypesRegistry,
      function isReady() {
        return Promise.resolve(true);
      }
    );
    const callClusterMock = jest.fn(() =>
      Promise.resolve(
        getResponseMock({
          aggregations: {
            ranges: {
              buckets: {
                all: { doc_count: 0, jobTypes: { buckets: [], }, layoutTypes: { doc_count: 0, pdf: { buckets: [], }, }, objectTypes: { doc_count: 0, pdf: { buckets: [], }, }, statusByApp: { buckets: [], }, statusTypes: { buckets: [], }, },
                last7Days: { doc_count: 0, jobTypes: { buckets: [], }, layoutTypes: { doc_count: 0, pdf: { buckets: [], }, }, objectTypes: { doc_count: 0, pdf: { buckets: [], }, }, statusByApp: { buckets: [], }, statusTypes: { buckets: [], }, },
                lastDay: { doc_count: 0, jobTypes: { buckets: [], }, layoutTypes: { doc_count: 0, pdf: { buckets: [], }, }, objectTypes: { doc_count: 0, pdf: { buckets: [], }, }, statusByApp: { buckets: [], }, statusTypes: { buckets: [], }, },
              },
            },
          },
        } as SearchResponse) // prettier-ignore
      )
    );

    const usageStats = await fetch(callClusterMock as any);
    expect(usageStats).toMatchSnapshot();
  });
});

describe('Ready for collection observable', () => {
  test('converts observable to promise', async () => {
    const mockConfig = getMockReportingConfig();
    const mockReporting = await createMockReportingCore(mockConfig);

    const usageCollection = getMockUsageCollection();
    const makeCollectorSpy = sinon.spy();
    usageCollection.makeUsageCollector = makeCollectorSpy;

    const plugins = getPluginsMock({ usageCollection } as any);
    registerReportingUsageCollector(mockReporting, plugins);

    const [args] = makeCollectorSpy.firstCall.args;
    expect(args).toMatchInlineSnapshot(`
      Object {
        "fetch": [Function],
        "formatForBulkUpload": [Function],
        "isReady": [Function],
        "type": "reporting",
      }
    `);

    await expect(args.isReady()).resolves.toBe(true);
  });
});
