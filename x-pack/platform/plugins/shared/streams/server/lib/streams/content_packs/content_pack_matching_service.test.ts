/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type { PackageClient } from '@kbn/fleet-plugin/server';
import type { PackageListItem, Installation, KibanaSavedObjectType } from '@kbn/fleet-plugin/common';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import {
  ContentPackMatchingService,
  extractDatasetFromStreamName,
  isClassicStream,
} from './content_pack_matching_service';

describe('extractDatasetFromStreamName', () => {
  it('extracts dataset from simple classic stream name', () => {
    expect(extractDatasetFromStreamName('logs-nginx-default')).toBe('nginx');
  });

  it('extracts dataset from metrics stream', () => {
    expect(extractDatasetFromStreamName('metrics-system.cpu-default')).toBe('system.cpu');
  });

  it('extracts dataset from otel stream', () => {
    expect(extractDatasetFromStreamName('metrics-hostmetricsreceiver.otel-default')).toBe(
      'hostmetricsreceiver.otel'
    );
  });

  it('extracts dataset from traces stream', () => {
    expect(extractDatasetFromStreamName('traces-apm-default')).toBe('apm');
  });

  it('extracts dataset from synthetics stream', () => {
    expect(extractDatasetFromStreamName('synthetics-http-default')).toBe('http');
  });

  it('extracts dataset from profiling stream', () => {
    expect(extractDatasetFromStreamName('profiling-events-default')).toBe('events');
  });

  it('returns null for wired stream (dot-separated)', () => {
    expect(extractDatasetFromStreamName('logs.my-app.production')).toBeNull();
  });

  it('returns null for stream name with invalid type', () => {
    expect(extractDatasetFromStreamName('invalid-type-default')).toBeNull();
  });

  it('returns null for stream name with less than 3 parts', () => {
    expect(extractDatasetFromStreamName('logs-nginx')).toBeNull();
  });

  it('returns null for single-word stream name', () => {
    expect(extractDatasetFromStreamName('logs')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractDatasetFromStreamName('')).toBeNull();
  });
});

describe('isClassicStream', () => {
  it('returns true for classic logs stream', () => {
    expect(isClassicStream('logs-nginx-default')).toBe(true);
  });

  it('returns true for classic metrics stream', () => {
    expect(isClassicStream('metrics-hostmetricsreceiver.otel-default')).toBe(true);
  });

  it('returns false for wired stream', () => {
    expect(isClassicStream('logs.my-app.production')).toBe(false);
  });

  it('returns false for invalid stream name', () => {
    expect(isClassicStream('some-random-name')).toBe(false);
  });
});

describe('ContentPackMatchingService', () => {
  let logger: MockedLogger;
  let packageClientMock: jest.Mocked<PackageClient>;
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;
  let service: ContentPackMatchingService;

  const createPackageListItem = (
    overrides: Partial<PackageListItem> = {}
  ): PackageListItem => ({
    id: 'test-package',
    name: 'test-package',
    title: 'Test Package',
    version: '1.0.0',
    type: 'content',
    status: 'installed',
    description: 'A test package',
    icons: [],
    discovery: {
      datasets: [{ name: 'test.dataset' }],
    },
    ...overrides,
  } as PackageListItem);

  const createInstallation = (
    overrides: Partial<Installation> = {}
  ): Installation => ({
    name: 'test-package',
    version: '1.0.0',
    installed_kibana: [
      { id: 'dashboard-1', type: 'dashboard' as KibanaSavedObjectType },
      { id: 'dashboard-2', type: 'dashboard' as KibanaSavedObjectType },
    ],
    installed_es: [],
    es_index_patterns: {},
    install_status: 'installed',
    install_version: '1.0.0',
    install_started_at: new Date().toISOString(),
    install_source: 'registry',
    verification_status: 'verified',
    ...overrides,
  } as Installation);

  beforeEach(() => {
    logger = loggerMock.create();

    packageClientMock = {
      getPackages: jest.fn(),
      getInstallation: jest.fn(),
    } as unknown as jest.Mocked<PackageClient>;

    soClientMock = {
      bulkGet: jest.fn(),
    } as unknown as jest.Mocked<SavedObjectsClientContract>;

    service = new ContentPackMatchingService({
      logger,
    });
  });

  describe('getSuggestions', () => {
    it('returns empty suggestions for non-classic stream', async () => {
      const result = await service.getSuggestions(
        'logs.my-app.production',
        soClientMock,
        packageClientMock
      );

      expect(result).toEqual({
        streamName: 'logs.my-app.production',
        dataset: '',
        dashboards: [],
      });
      expect(packageClientMock.getPackages).not.toHaveBeenCalled();
    });

    it('returns empty suggestions when no content packages match', async () => {
      packageClientMock.getPackages.mockResolvedValue([
        createPackageListItem({
          name: 'other-package',
          discovery: {
            datasets: [{ name: 'other.dataset' }],
          },
        }),
      ]);

      const result = await service.getSuggestions(
        'metrics-hostmetricsreceiver.otel-default',
        soClientMock,
        packageClientMock
      );

      expect(result).toEqual({
        streamName: 'metrics-hostmetricsreceiver.otel-default',
        dataset: 'hostmetricsreceiver.otel',
        dashboards: [],
      });
    });

    it('returns dashboards from matching content package', async () => {
      packageClientMock.getPackages.mockResolvedValue([
        createPackageListItem({
          name: 'system_otel',
          title: 'System (OTel)',
          version: '2.0.0',
          discovery: {
            datasets: [{ name: 'hostmetricsreceiver.otel' }],
          },
        }),
      ]);

      packageClientMock.getInstallation.mockResolvedValue(
        createInstallation({
          name: 'system_otel',
          version: '2.0.0',
          installed_kibana: [
            { id: 'dashboard-system-overview', type: 'dashboard' as KibanaSavedObjectType },
            { id: 'dashboard-cpu-metrics', type: 'dashboard' as KibanaSavedObjectType },
            { id: 'some-visualization', type: 'visualization' as KibanaSavedObjectType },
          ],
        })
      );

      soClientMock.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'dashboard-system-overview',
            type: 'dashboard',
            attributes: { title: 'System Overview' },
            references: [],
          },
          {
            id: 'dashboard-cpu-metrics',
            type: 'dashboard',
            attributes: { title: 'CPU Metrics' },
            references: [],
          },
        ],
      });

      const result = await service.getSuggestions(
        'metrics-hostmetricsreceiver.otel-default',
        soClientMock,
        packageClientMock
      );

      expect(result).toEqual({
        streamName: 'metrics-hostmetricsreceiver.otel-default',
        dataset: 'hostmetricsreceiver.otel',
        dashboards: [
          {
            id: 'dashboard-system-overview',
            title: 'System Overview',
            packageName: 'system_otel',
            packageTitle: 'System (OTel)',
            packageVersion: '2.0.0',
          },
          {
            id: 'dashboard-cpu-metrics',
            title: 'CPU Metrics',
            packageName: 'system_otel',
            packageTitle: 'System (OTel)',
            packageVersion: '2.0.0',
          },
        ],
      });
    });

    it('filters out non-installed packages', async () => {
      packageClientMock.getPackages.mockResolvedValue([
        createPackageListItem({
          name: 'system_otel',
          status: 'not_installed',
          discovery: {
            datasets: [{ name: 'hostmetricsreceiver.otel' }],
          },
        }),
      ]);

      const result = await service.getSuggestions(
        'metrics-hostmetricsreceiver.otel-default',
        soClientMock,
        packageClientMock
      );

      expect(result.dashboards).toEqual([]);
      expect(packageClientMock.getInstallation).not.toHaveBeenCalled();
    });

    it('filters out non-content packages', async () => {
      packageClientMock.getPackages.mockResolvedValue([
        createPackageListItem({
          name: 'system',
          type: 'integration',
          discovery: {
            datasets: [{ name: 'hostmetricsreceiver.otel' }],
          },
        }),
      ]);

      const result = await service.getSuggestions(
        'metrics-hostmetricsreceiver.otel-default',
        soClientMock,
        packageClientMock
      );

      expect(result.dashboards).toEqual([]);
    });

    it('filters out packages without discovery datasets', async () => {
      packageClientMock.getPackages.mockResolvedValue([
        createPackageListItem({
          name: 'some-content',
          discovery: undefined,
        }),
      ]);

      const result = await service.getSuggestions(
        'metrics-hostmetricsreceiver.otel-default',
        soClientMock,
        packageClientMock
      );

      expect(result.dashboards).toEqual([]);
    });

    it('handles multiple matching packages', async () => {
      packageClientMock.getPackages.mockResolvedValue([
        createPackageListItem({
          name: 'package-a',
          title: 'Package A',
          discovery: {
            datasets: [{ name: 'hostmetricsreceiver.otel' }],
          },
        }),
        createPackageListItem({
          name: 'package-b',
          title: 'Package B',
          discovery: {
            datasets: [{ name: 'hostmetricsreceiver.otel' }],
          },
        }),
      ]);

      packageClientMock.getInstallation
        .mockResolvedValueOnce(
          createInstallation({
            name: 'package-a',
            installed_kibana: [{ id: 'dashboard-a', type: 'dashboard' as KibanaSavedObjectType }],
          })
        )
        .mockResolvedValueOnce(
          createInstallation({
            name: 'package-b',
            installed_kibana: [{ id: 'dashboard-b', type: 'dashboard' as KibanaSavedObjectType }],
          })
        );

      soClientMock.bulkGet
        .mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'dashboard-a',
              type: 'dashboard',
              attributes: { title: 'Dashboard A' },
              references: [],
            },
          ],
        })
        .mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'dashboard-b',
              type: 'dashboard',
              attributes: { title: 'Dashboard B' },
              references: [],
            },
          ],
        });

      const result = await service.getSuggestions(
        'metrics-hostmetricsreceiver.otel-default',
        soClientMock,
        packageClientMock
      );

      expect(result.dashboards).toHaveLength(2);
      expect(result.dashboards.map((d) => d.id)).toEqual(['dashboard-a', 'dashboard-b']);
    });

    it('handles dashboard fetch errors gracefully', async () => {
      packageClientMock.getPackages.mockResolvedValue([
        createPackageListItem({
          name: 'system_otel',
          discovery: {
            datasets: [{ name: 'hostmetricsreceiver.otel' }],
          },
        }),
      ]);

      packageClientMock.getInstallation.mockResolvedValue(
        createInstallation({
          installed_kibana: [{ id: 'dashboard-1', type: 'dashboard' as KibanaSavedObjectType }],
        })
      );

      soClientMock.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'dashboard-1',
            type: 'dashboard',
            attributes: {},
            references: [],
            error: {
              statusCode: 404,
              message: 'Not found',
              error: 'Not Found',
            },
          },
        ],
      });

      const result = await service.getSuggestions(
        'metrics-hostmetricsreceiver.otel-default',
        soClientMock,
        packageClientMock
      );

      // Should return empty dashboards since the only one errored
      expect(result.dashboards).toEqual([]);
    });

    it('uses dashboard id as title when title is missing', async () => {
      packageClientMock.getPackages.mockResolvedValue([
        createPackageListItem({
          name: 'system_otel',
          discovery: {
            datasets: [{ name: 'hostmetricsreceiver.otel' }],
          },
        }),
      ]);

      packageClientMock.getInstallation.mockResolvedValue(
        createInstallation({
          installed_kibana: [{ id: 'dashboard-no-title', type: 'dashboard' as KibanaSavedObjectType }],
        })
      );

      soClientMock.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'dashboard-no-title',
            type: 'dashboard',
            attributes: {},
            references: [],
          },
        ],
      });

      const result = await service.getSuggestions(
        'metrics-hostmetricsreceiver.otel-default',
        soClientMock,
        packageClientMock
      );

      expect(result.dashboards[0].title).toBe('dashboard-no-title');
    });
  });
});
