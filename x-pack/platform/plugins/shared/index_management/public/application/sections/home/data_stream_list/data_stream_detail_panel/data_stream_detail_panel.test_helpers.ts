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
    manage: true,
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
          navigate: jest.fn(),
        })),
      },
    },
    core: {
      getUrlForApp: jest.fn(
        (_appId: string, { path }: { path?: string } = {}) => `/app${path ?? ''}`
      ),
      notifications: {
        toasts: {
          addDanger: jest.fn(),
          addError: jest.fn(),
          addSuccess: jest.fn(),
          addWarning: jest.fn(),
        },
      },
      application: {
        navigateToUrl: jest.fn(),
        capabilities: {
          management: {
            data: {
              snapshot_restore: true,
            },
            stack: {
              license_management: true,
            },
          },
        },
      },
    },
    plugins: {
      licensing: undefined,
      cloud: undefined,
    },
    services: {
      notificationService: {
        showDangerToast: jest.fn(),
        showWarningToast: jest.fn(),
        showSuccessToast: jest.fn(),
        showInfoToast: jest.fn(),
      },
    },
    docLinks: {
      links: {
        subscriptions: 'https://www.elastic.co/subscriptions',
      },
    },
    config: {
      enableSizeAndDocCount: true,
      enableDataStreamStats: true,
      enableTogglingDataRetention: true,
      enableIndexMode: true,
      isServerless: false,
    },
  } as unknown as AppDependencies);
