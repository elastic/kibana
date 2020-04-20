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
                all: {
                  doc_count: 54,
                  layoutTypes: {
                    doc_count: 23,
                    pdf: {
                      doc_count_error_upper_bound: 0,
                      sum_other_doc_count: 0,
                      buckets: [
                        { key: 'preserve_layout', doc_count: 13 },
                        { key: 'print', doc_count: 10 },
                      ],
                    },
                  },
                  objectTypes: {
                    doc_count: 23,
                    pdf: {
                      doc_count_error_upper_bound: 0,
                      sum_other_doc_count: 0,
                      buckets: [{ key: 'dashboard', doc_count: 23 }],
                    },
                  },
                  statusTypes: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [
                      { key: 'pending', doc_count: 33 },
                      { key: 'completed', doc_count: 20 },
                      { key: 'processing', doc_count: 1 },
                    ],
                  },
                  jobTypes: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [
                      { key: 'csv', doc_count: 27 },
                      { key: 'printable_pdf', doc_count: 23 },
                      { key: 'PNG', doc_count: 4 },
                    ],
                  },
                },
                lastDay: {
                  doc_count: 11,
                  layoutTypes: {
                    doc_count: 2,
                    pdf: {
                      doc_count_error_upper_bound: 0,
                      sum_other_doc_count: 0,
                      buckets: [{ key: 'print', doc_count: 2 }],
                    },
                  },
                  objectTypes: {
                    doc_count: 2,
                    pdf: {
                      doc_count_error_upper_bound: 0,
                      sum_other_doc_count: 0,
                      buckets: [{ key: 'dashboard', doc_count: 2 }],
                    },
                  },
                  statusTypes: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [{ key: 'pending', doc_count: 11 }],
                  },
                  jobTypes: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [
                      { key: 'csv', doc_count: 5 },
                      { key: 'PNG', doc_count: 4 },
                      { key: 'printable_pdf', doc_count: 2 },
                    ],
                  },
                },
                last7Days: {
                  doc_count: 27,
                  layoutTypes: {
                    doc_count: 13,
                    pdf: {
                      doc_count_error_upper_bound: 0,
                      sum_other_doc_count: 0,
                      buckets: [
                        { key: 'print', doc_count: 10 },
                        { key: 'preserve_layout', doc_count: 3 },
                      ],
                    },
                  },
                  objectTypes: {
                    doc_count: 13,
                    pdf: {
                      doc_count_error_upper_bound: 0,
                      sum_other_doc_count: 0,
                      buckets: [{ key: 'dashboard', doc_count: 13 }],
                    },
                  },
                  statusTypes: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [{ key: 'pending', doc_count: 27 }],
                  },
                  jobTypes: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [
                      { key: 'printable_pdf', doc_count: 13 },
                      { key: 'csv', doc_count: 10 },
                      { key: 'PNG', doc_count: 4 },
                    ],
                  },
                },
              },
            },
          },
        })
      )
    );

    const usageStats = await fetch(callClusterMock as any);
    expect(usageStats).toMatchSnapshot();
  });

  test('status by app', async () => {
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
                all: {
                  smashTypes: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [
                      { key: 'pending', doc_count: 33 },
                      { key: 'completed', doc_count: 20 },
                      { key: 'processing', doc_count: 1 },
                    ],
                  },
                },
              },
            },
          },
        })
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
