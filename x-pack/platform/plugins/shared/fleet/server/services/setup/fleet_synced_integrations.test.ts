/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licenseService } from '../license';

import {
  createCCSIndexPatterns,
  createOrUpdateFleetSyncedIntegrationsIndex,
} from './fleet_synced_integrations';

jest.mock('../app_context', () => ({
  appContextService: {
    getExperimentalFeatures: jest.fn().mockReturnValue({ enableSyncIntegrationsOnRemote: true }),
    getLogger: jest.fn().mockReturnValue({
      error: jest.fn(),
      debug: jest.fn(),
    }),
    getConfig: jest.fn().mockReturnValue({
      enableManagedLogsAndMetricsDataviews: true,
    }),
    getCloud: jest.fn().mockReturnValue({
      isServerlessEnabled: false,
    }),
  },
}));

jest.mock('@kbn/utils', () => ({
  createListStream: jest
    .fn()
    .mockImplementation((indexPatterns) =>
      indexPatterns.map((indexPattern: any) => indexPattern.id)
    ),
}));

describe('fleet_synced_integrations', () => {
  let esClientMock: any;
  const mockExists = jest.fn();
  const mockGetMapping = jest.fn();
  let soClientMock: any;
  let soImporterMock: any;

  beforeEach(() => {
    esClientMock = {
      indices: {
        create: jest.fn(),
        exists: mockExists,
        getMapping: mockGetMapping,
        putMapping: jest.fn(),
      },
      cluster: {
        remoteInfo: jest.fn().mockReturnValue({
          remote1: {},
          remote2: {},
        }),
      },
    };
    soClientMock = {
      updateObjectsSpaces: jest.fn(),
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          { id: 'remote1:logs-*', type: 'index-pattern', namespaces: ['default', '*'] },
          { id: 'remote2:logs-*', type: 'index-pattern', namespaces: ['default'] },
        ],
      }),
    };
    soImporterMock = {
      import: jest.fn(),
    };
  });

  describe('with Enterprise license', () => {
    beforeAll(() => {
      jest.spyOn(licenseService, 'isEnterprise').mockReturnValue(true);
    });

    it('should create index if does not exist', async () => {
      mockExists.mockResolvedValue(false);

      await createOrUpdateFleetSyncedIntegrationsIndex(esClientMock);

      expect(esClientMock.indices.create).toHaveBeenCalled();
    });
    it('should update index if older version exists', async () => {
      mockExists.mockResolvedValue(true);
      mockGetMapping.mockResolvedValue({
        'fleet-synced-integrations': {
          mappings: {
            _meta: {
              version: '0.0',
            },
          },
        },
      });

      await createOrUpdateFleetSyncedIntegrationsIndex(esClientMock);

      expect(esClientMock.indices.putMapping).toHaveBeenCalled();
    });

    it('should not update index if same version exists', async () => {
      mockExists.mockResolvedValue(true);
      mockGetMapping.mockResolvedValue({
        'fleet-synced-integrations': {
          mappings: {
            _meta: {
              version: '1.0',
            },
          },
        },
      });

      await createOrUpdateFleetSyncedIntegrationsIndex(esClientMock);

      expect(esClientMock.indices.putMapping).not.toHaveBeenCalled();
    });

    it('should create index patterns for remote clusters', async () => {
      await createCCSIndexPatterns(esClientMock, soClientMock, soImporterMock);

      expect(soImporterMock.import).toHaveBeenCalledWith(
        expect.objectContaining({
          readStream: ['remote1:metrics-*', 'remote2:metrics-*'],
        })
      );

      expect(soClientMock.updateObjectsSpaces).toHaveBeenCalledTimes(3);
      expect(soClientMock.updateObjectsSpaces).toHaveBeenCalledWith(
        [{ id: 'remote1:metrics-*', type: 'index-pattern' }],
        ['*'],
        []
      );
      expect(soClientMock.updateObjectsSpaces).toHaveBeenCalledWith(
        [{ id: 'remote2:logs-*', type: 'index-pattern' }],
        ['*'],
        []
      );
      expect(soClientMock.updateObjectsSpaces).toHaveBeenCalledWith(
        [{ id: 'remote2:metrics-*', type: 'index-pattern' }],
        ['*'],
        []
      );
    });
  });

  describe('with less than Enterprise license', () => {
    beforeAll(() => {
      jest.spyOn(licenseService, 'isEnterprise').mockReturnValue(false);
    });

    it('should not create index patterns for remote clusters', async () => {
      await createCCSIndexPatterns(esClientMock, soClientMock, soImporterMock);

      expect(soImporterMock.import).not.toHaveBeenCalled();

      expect(soClientMock.updateObjectsSpaces).not.toHaveBeenCalled();
    });
  });
});
