/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PackageClient } from '@kbn/fleet-plugin/server';
import type { KibanaAssetReference, KibanaSavedObjectType } from '@kbn/fleet-plugin/common';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import {
  getInstalledSavedQueriesMap,
  getPrebuiltSavedQueryIds,
  isSavedQueryPrebuilt,
} from './utils';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { savedQuerySavedObjectType } from '../../../common/types';

describe('saved query utils', () => {
  const mockPackageService = {
    getInstallation: jest.fn(),
  } as unknown as PackageClient;

  const mockSavedObjectsClient = {} as SavedObjectsClientContract;

  const mockSavedQueryAsset: KibanaAssetReference = {
    id: 'saved-query-1',
    type: savedQuerySavedObjectType as KibanaSavedObjectType,
  };

  const mockOtherAsset: KibanaAssetReference = {
    id: 'other-asset-1',
    type: 'other-type' as KibanaSavedObjectType,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstalledSavedQueriesMap', () => {
    it('should return empty object when no installation found', async () => {
      (mockPackageService.getInstallation as jest.Mock).mockResolvedValue(null);

      const result = await getInstalledSavedQueriesMap(
        mockPackageService,
        mockSavedObjectsClient,
        'default'
      );

      expect(result).toEqual({});
      expect(mockPackageService.getInstallation).toHaveBeenCalledWith(
        OSQUERY_INTEGRATION_NAME,
        mockSavedObjectsClient
      );
    });

    it('should return empty object when packageService is undefined', async () => {
      const result = await getInstalledSavedQueriesMap(
        undefined,
        mockSavedObjectsClient,
        'default'
      );

      expect(result).toEqual({});
    });

    it('should return saved queries map for default space', async () => {
      const mockInstallation = {
        installed_kibana_space_id: DEFAULT_SPACE_ID,
        installed_kibana: [mockSavedQueryAsset, mockOtherAsset],
      };

      (mockPackageService.getInstallation as jest.Mock).mockResolvedValue(mockInstallation);

      const result = await getInstalledSavedQueriesMap(
        mockPackageService,
        mockSavedObjectsClient,
        DEFAULT_SPACE_ID
      );

      expect(result).toEqual({
        'saved-query-1': mockSavedQueryAsset,
      });
    });

    it('should return saved queries map for default space when installed_kibana_space_id is undefined', async () => {
      const mockInstallation = {
        installed_kibana: [mockSavedQueryAsset, mockOtherAsset],
      };

      (mockPackageService.getInstallation as jest.Mock).mockResolvedValue(mockInstallation);

      const result = await getInstalledSavedQueriesMap(
        mockPackageService,
        mockSavedObjectsClient,
        DEFAULT_SPACE_ID
      );

      expect(result).toEqual({
        'saved-query-1': mockSavedQueryAsset,
      });
    });

    it('should return saved queries map for additional space', async () => {
      const customSpaceId = 'custom-space';
      const mockInstallation = {
        installed_kibana_space_id: 'other-space',
        installed_kibana: [mockOtherAsset],
        additional_spaces_installed_kibana: {
          [customSpaceId]: [mockSavedQueryAsset],
        },
      };

      (mockPackageService.getInstallation as jest.Mock).mockResolvedValue(mockInstallation);

      const result = await getInstalledSavedQueriesMap(
        mockPackageService,
        mockSavedObjectsClient,
        customSpaceId
      );

      expect(result).toEqual({
        'saved-query-1': mockSavedQueryAsset,
      });
    });

    it('should return empty object when space is not found in additional spaces', async () => {
      const customSpaceId = 'custom-space';
      const mockInstallation = {
        installed_kibana_space_id: 'yet-another-space',
        installed_kibana: [mockSavedQueryAsset],
        additional_spaces_installed_kibana: {
          'different-space': [mockSavedQueryAsset],
        },
      };

      (mockPackageService.getInstallation as jest.Mock).mockResolvedValue(mockInstallation);

      const result = await getInstalledSavedQueriesMap(
        mockPackageService,
        mockSavedObjectsClient,
        customSpaceId
      );

      expect(result).toEqual({});
    });

    it('should filter out non-saved-query assets', async () => {
      const mockInstallation = {
        installed_kibana_space_id: DEFAULT_SPACE_ID,
        installed_kibana: [
          mockSavedQueryAsset,
          mockOtherAsset,
          { id: 'saved-query-2', type: savedQuerySavedObjectType },
        ],
      };

      (mockPackageService.getInstallation as jest.Mock).mockResolvedValue(mockInstallation);

      const result = await getInstalledSavedQueriesMap(
        mockPackageService,
        mockSavedObjectsClient,
        DEFAULT_SPACE_ID
      );

      expect(result).toEqual({
        'saved-query-1': mockSavedQueryAsset,
        'saved-query-2': { id: 'saved-query-2', type: savedQuerySavedObjectType },
      });
    });
  });

  describe('getPrebuiltSavedQueryIds', () => {
    it('should return empty array when no installation found', async () => {
      (mockPackageService.getInstallation as jest.Mock).mockResolvedValue(null);

      const result = await getPrebuiltSavedQueryIds(mockPackageService);

      expect(result).toEqual([]);
      expect(mockPackageService.getInstallation).toHaveBeenCalledWith(OSQUERY_INTEGRATION_NAME);
    });

    it('should return empty array when packageService is undefined', async () => {
      const result = await getPrebuiltSavedQueryIds(undefined);

      expect(result).toEqual([]);
    });

    it('should return saved query IDs from installation', async () => {
      const mockInstallation = {
        installed_kibana: [
          mockSavedQueryAsset,
          mockOtherAsset,
          { id: 'saved-query-2', type: savedQuerySavedObjectType },
          { id: 'saved-query-3', type: savedQuerySavedObjectType },
        ],
      };

      (mockPackageService.getInstallation as jest.Mock).mockResolvedValue(mockInstallation);

      const result = await getPrebuiltSavedQueryIds(mockPackageService);

      expect(result).toEqual(['saved-query-1', 'saved-query-2', 'saved-query-3']);
    });

    it('should filter out non-saved-query assets', async () => {
      const mockInstallation = {
        installed_kibana: [
          mockOtherAsset,
          { id: 'another-asset', type: 'another-type' },
          mockSavedQueryAsset,
        ],
      };

      (mockPackageService.getInstallation as jest.Mock).mockResolvedValue(mockInstallation);

      const result = await getPrebuiltSavedQueryIds(mockPackageService);

      expect(result).toEqual(['saved-query-1']);
    });
  });

  describe('isSavedQueryPrebuilt', () => {
    const savedQueryId = 'test-saved-query';

    it('should return false when no installation found', async () => {
      (mockPackageService.getInstallation as jest.Mock).mockResolvedValue(null);

      const result = await isSavedQueryPrebuilt(
        mockPackageService,
        savedQueryId,
        mockSavedObjectsClient,
        'default'
      );

      expect(result).toBe(false);
      expect(mockPackageService.getInstallation).toHaveBeenCalledWith(
        OSQUERY_INTEGRATION_NAME,
        mockSavedObjectsClient
      );
    });

    it('should return false when packageService is undefined', async () => {
      const result = await isSavedQueryPrebuilt(
        undefined,
        savedQueryId,
        mockSavedObjectsClient,
        'default'
      );

      expect(result).toBe(false);
    });

    it('should return true when saved query is found in default space', async () => {
      const mockInstallation = {
        installed_kibana_space_id: DEFAULT_SPACE_ID,
        installed_kibana: [{ id: savedQueryId, type: savedQuerySavedObjectType }, mockOtherAsset],
      };

      (mockPackageService.getInstallation as jest.Mock).mockResolvedValue(mockInstallation);

      const result = await isSavedQueryPrebuilt(
        mockPackageService,
        savedQueryId,
        mockSavedObjectsClient,
        DEFAULT_SPACE_ID
      );

      expect(result).toBe(true);
    });

    it('should return true when saved query is found in default space and installed_kibana_space_id is undefined', async () => {
      const mockInstallation = {
        installed_kibana: [{ id: savedQueryId, type: savedQuerySavedObjectType }, mockOtherAsset],
      };

      (mockPackageService.getInstallation as jest.Mock).mockResolvedValue(mockInstallation);

      const result = await isSavedQueryPrebuilt(
        mockPackageService,
        savedQueryId,
        mockSavedObjectsClient,
        DEFAULT_SPACE_ID
      );

      expect(result).toBe(true);
    });

    it('should return true when saved query is found in additional space', async () => {
      const customSpaceId = 'custom-space';
      const mockInstallation = {
        installed_kibana_space_id: 'other-space',
        installed_kibana: [mockOtherAsset],
        additional_spaces_installed_kibana: {
          [customSpaceId]: [{ id: savedQueryId, type: savedQuerySavedObjectType }],
        },
      };

      (mockPackageService.getInstallation as jest.Mock).mockResolvedValue(mockInstallation);

      const result = await isSavedQueryPrebuilt(
        mockPackageService,
        savedQueryId,
        mockSavedObjectsClient,
        customSpaceId
      );

      expect(result).toBe(true);
    });

    it('should return false when saved query is not found in space', async () => {
      const customSpaceId = 'custom-space';
      const mockInstallation = {
        installed_kibana_space_id: 'yet-another-space',
        installed_kibana: [{ id: 'different-query', type: savedQuerySavedObjectType }],
        additional_spaces_installed_kibana: {
          'different-space': [{ id: 'another-query', type: savedQuerySavedObjectType }],
        },
      };

      (mockPackageService.getInstallation as jest.Mock).mockResolvedValue(mockInstallation);

      const result = await isSavedQueryPrebuilt(
        mockPackageService,
        savedQueryId,
        mockSavedObjectsClient,
        customSpaceId
      );

      expect(result).toBe(false);
    });

    it('should return false when saved query has wrong type', async () => {
      const mockInstallation = {
        installed_kibana_space_id: DEFAULT_SPACE_ID,
        installed_kibana: [{ id: savedQueryId, type: 'wrong-type' }, mockOtherAsset],
      };

      (mockPackageService.getInstallation as jest.Mock).mockResolvedValue(mockInstallation);

      const result = await isSavedQueryPrebuilt(
        mockPackageService,
        savedQueryId,
        mockSavedObjectsClient,
        DEFAULT_SPACE_ID
      );

      expect(result).toBe(false);
    });

    it('should return false when space is not found in additional spaces', async () => {
      const customSpaceId = 'custom-space';
      const mockInstallation = {
        installed_kibana_space_id: 'other-space',
        installed_kibana: [mockOtherAsset],
        additional_spaces_installed_kibana: {
          'different-space': [{ id: savedQueryId, type: savedQuerySavedObjectType }],
        },
      };

      (mockPackageService.getInstallation as jest.Mock).mockResolvedValue(mockInstallation);

      const result = await isSavedQueryPrebuilt(
        mockPackageService,
        savedQueryId,
        mockSavedObjectsClient,
        customSpaceId
      );

      expect(result).toBe(false);
    });
  });
});
