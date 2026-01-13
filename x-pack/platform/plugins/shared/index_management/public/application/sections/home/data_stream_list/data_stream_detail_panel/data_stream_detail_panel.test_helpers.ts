/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStream } from '../../../../../../common';
import type { AppDependencies } from '../../../../app_context';

export const createMockDataStream = (overrides?: Partial<DataStream>): DataStream => ({
  name: 'test-data-stream',
  timeStampField: { name: '@timestamp' },
  indices: [
    {
      name: 'indexName',
      uuid: 'indexId',
      preferILM: false,
      managedBy: 'Data stream lifecycle',
    },
  ],
  generation: 1,
  nextGenerationManagedBy: 'Data stream lifecycle',
  health: 'green',
  indexTemplateName: 'indexTemplate',
  storageSize: '1b',
  storageSizeBytes: 1,
  maxTimeStamp: 420,
  meteringStorageSize: '1b',
  meteringStorageSizeBytes: 1,
  meteringDocsCount: 10,
  privileges: {
    delete_index: true,
    manage_data_stream_lifecycle: true,
    read_failure_store: true,
  },
  hidden: false,
  lifecycle: {
    enabled: true,
    data_retention: '7d',
  },
  indexMode: 'standard',
  failureStoreEnabled: false,
  ...overrides,
});

export const createMockAppContext = (): AppDependencies =>
  ({
    url: {
      locators: {
        get: jest.fn(() => ({
          getRedirectUrl: jest.fn(() => '/app/path'),
        })),
      },
    },
    core: {
      application: {
        navigateToUrl: jest.fn(),
      },
    },
    config: {
      enableSizeAndDocCount: true,
      enableDataStreamStats: true,
      enableTogglingDataRetention: true,
    },
  } as unknown as AppDependencies);
