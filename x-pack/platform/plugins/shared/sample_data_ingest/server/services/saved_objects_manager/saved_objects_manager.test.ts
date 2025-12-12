/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../saved_objects/saved_objects', () => {
  return {
    getSavedObjects: jest.fn(),
    getDashboardId: jest.fn(),
  };
});

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  ISavedObjectsImporter,
  SavedObject,
  SavedObjectsImportFailure,
} from '@kbn/core/server';
import { Readable } from 'stream';
import { DatasetSampleType } from '../../../common';
import { SavedObjectsManager } from './saved_objects_manager';
import { getSavedObjects, getDashboardId } from '../../saved_objects/saved_objects';

const mockGetSavedObjects = getSavedObjects as jest.MockedFunction<typeof getSavedObjects>;
const mockGetDashboardId = getDashboardId as jest.MockedFunction<typeof getDashboardId>;

describe('SavedObjectsManager', () => {
  let logger: MockedLogger;
  let savedObjectsManager: SavedObjectsManager;
  let mockSoClient: ReturnType<typeof savedObjectsClientMock.create>;
  let mockSoImporter: jest.Mocked<ISavedObjectsImporter>;

  const mockSavedObjects: SavedObject[] = [
    {
      id: 'test-index-pattern-id',
      type: 'index-pattern',
      version: '1',
      attributes: {
        title: 'test-index-pattern',
      },
      references: [],
    },
    {
      id: 'test-dashboard-id',
      type: 'dashboard',
      version: '1',
      attributes: {
        title: 'Test Dashboard',
        description: 'Test dashboard description',
      },
      references: [],
    },
    {
      id: 'test-visualization-id',
      type: 'visualization',
      version: '1',
      attributes: {
        title: 'Test Visualization',
      },
      references: [],
    },
  ];

  beforeEach(() => {
    logger = loggerMock.create();
    mockSoClient = savedObjectsClientMock.create();
    mockSoImporter = {
      import: jest.fn(),
    } as any;

    savedObjectsManager = new SavedObjectsManager({
      logger,
    });

    mockGetSavedObjects.mockReturnValue(mockSavedObjects);
    mockGetDashboardId.mockReturnValue('test-dashboard-id');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct logger', () => {
      expect(savedObjectsManager).toBeInstanceOf(SavedObjectsManager);
    });
  });

  describe('importSavedObjects', () => {
    it('should import saved objects successfully', async () => {
      const sampleType = DatasetSampleType.elasticsearch;
      mockSoImporter.import.mockResolvedValue({
        success: true,
        successCount: 3,
        errors: [],
        successResults: [],
        warnings: [],
      });

      const result = await savedObjectsManager.importSavedObjects(mockSoImporter, sampleType);

      expect(mockGetSavedObjects).toHaveBeenCalledWith(sampleType);
      expect(mockSoImporter.import).toHaveBeenCalledWith({
        readStream: expect.any(Readable),
        overwrite: true,
        createNewCopies: false,
      });
      expect(result).toEqual({
        savedObjects: mockSavedObjects,
        dashboardId: 'test-dashboard-id',
      });
    });

    it('should return undefined dashboardId when no dashboard exists', async () => {
      const sampleType = DatasetSampleType.elasticsearch;
      const savedObjectsWithoutDashboard = mockSavedObjects.filter(
        (obj) => obj.type !== 'dashboard'
      );
      mockGetSavedObjects.mockReturnValue(savedObjectsWithoutDashboard);
      mockGetDashboardId.mockReturnValue(undefined);

      mockSoImporter.import.mockResolvedValue({
        success: true,
        successCount: 2,
        errors: [],
        successResults: [],
        warnings: [],
      });

      const result = await savedObjectsManager.importSavedObjects(mockSoImporter, sampleType);

      expect(result).toEqual({
        savedObjects: savedObjectsWithoutDashboard,
        dashboardId: undefined,
      });
    });

    it('should throw error when import fails', async () => {
      const sampleType = DatasetSampleType.elasticsearch;
      const importErrors = [
        {
          type: 'dashboard',
          id: 'test-dashboard-id',
          error: {
            type: 'conflict',
            message: 'Version conflict',
          },
          meta: {},
        },
      ];

      mockSoImporter.import.mockResolvedValue({
        success: false,
        successCount: 2,
        errors: importErrors as SavedObjectsImportFailure[],
        successResults: [],
        warnings: [],
      });

      await expect(
        savedObjectsManager.importSavedObjects(mockSoImporter, sampleType)
      ).rejects.toThrow('Errors while loading saved objects');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Errors while loading saved objects')
      );
    });

    it('should handle empty errors array', async () => {
      const sampleType = DatasetSampleType.elasticsearch;
      mockSoImporter.import.mockResolvedValue({
        success: true,
        successCount: 3,
        errors: [],
        successResults: [],
        warnings: [],
      });

      const result = await savedObjectsManager.importSavedObjects(mockSoImporter, sampleType);

      expect(result.savedObjects).toEqual(mockSavedObjects);
      expect(result.dashboardId).toBe('test-dashboard-id');
    });
  });

  describe('deleteSavedObjects', () => {
    it('should delete saved objects successfully', async () => {
      const sampleType = DatasetSampleType.elasticsearch;
      mockSoClient.delete.mockResolvedValue({} as any);

      const result = await savedObjectsManager.deleteSavedObjects(mockSoClient, sampleType);

      expect(mockGetSavedObjects).toHaveBeenCalledWith(sampleType);
      expect(mockSoClient.delete).toHaveBeenCalledTimes(3);
      expect(mockSoClient.delete).toHaveBeenCalledWith('index-pattern', 'test-index-pattern-id');
      expect(mockSoClient.delete).toHaveBeenCalledWith('dashboard', 'test-dashboard-id');
      expect(mockSoClient.delete).toHaveBeenCalledWith('visualization', 'test-visualization-id');
      expect(result).toBe(3);
    });

    it('should skip objects that do not exist (404 errors)', async () => {
      const sampleType = DatasetSampleType.elasticsearch;
      const notFoundError = SavedObjectsErrorHelpers.createGenericNotFoundError(
        'dashboard',
        'test-dashboard-id'
      );

      mockSoClient.delete
        .mockResolvedValueOnce({} as any) // index-pattern succeeds
        .mockRejectedValueOnce(notFoundError) // dashboard not found
        .mockResolvedValueOnce({} as any); // visualization succeeds

      const result = await savedObjectsManager.deleteSavedObjects(mockSoClient, sampleType);

      expect(mockSoClient.delete).toHaveBeenCalledTimes(3);
      expect(result).toBe(2); // Only 2 were actually deleted
      expect(logger.debug).toHaveBeenCalledWith(
        'Saved object dashboard:test-dashboard-id not found, skipping deletion'
      );
    });

    it('should throw error for non-404 errors', async () => {
      const sampleType = DatasetSampleType.elasticsearch;
      const serverError = new Error('Internal server error');

      mockSoClient.delete
        .mockResolvedValueOnce({} as any) // index-pattern succeeds
        .mockRejectedValueOnce(serverError); // dashboard fails with server error

      await expect(
        savedObjectsManager.deleteSavedObjects(mockSoClient, sampleType)
      ).rejects.toThrow('Unable to delete sample dataset saved objects');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to delete saved object dashboard:test-dashboard-id: Internal server error'
      );
    });
  });

  describe('getDashboardId', () => {
    it('should return dashboard ID when dashboard exists', async () => {
      const sampleType = DatasetSampleType.elasticsearch;
      mockSoClient.get.mockResolvedValue({
        id: 'test-dashboard-id',
        type: 'dashboard',
        attributes: {},
        references: [],
      } as any);

      const result = await savedObjectsManager.getDashboardId(mockSoClient, sampleType);

      expect(mockGetDashboardId).toHaveBeenCalledWith(sampleType);
      expect(mockSoClient.get).toHaveBeenCalledWith('dashboard', 'test-dashboard-id');
      expect(result).toBe('test-dashboard-id');
    });

    it('should return undefined when no dashboard exists in saved objects', async () => {
      const sampleType = DatasetSampleType.elasticsearch;
      mockGetDashboardId.mockReturnValue(undefined);

      const result = await savedObjectsManager.getDashboardId(mockSoClient, sampleType);

      expect(mockGetDashboardId).toHaveBeenCalledWith(sampleType);
      expect(mockSoClient.get).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should return undefined when dashboard does not exist in saved objects client', async () => {
      const sampleType = DatasetSampleType.elasticsearch;
      const notFoundError = SavedObjectsErrorHelpers.createGenericNotFoundError(
        'dashboard',
        'test-dashboard-id'
      );
      mockSoClient.get.mockRejectedValue(notFoundError);

      const result = await savedObjectsManager.getDashboardId(mockSoClient, sampleType);

      expect(mockGetDashboardId).toHaveBeenCalledWith(sampleType);
      expect(mockSoClient.get).toHaveBeenCalledWith('dashboard', 'test-dashboard-id');
      expect(result).toBeUndefined();
    });

    it('should throw error for non-404 errors when checking dashboard existence', async () => {
      const sampleType = DatasetSampleType.elasticsearch;
      const serverError = new Error('Internal server error');
      mockSoClient.get.mockRejectedValue(serverError);

      await expect(savedObjectsManager.getDashboardId(mockSoClient, sampleType)).rejects.toThrow(
        'Internal server error'
      );
      expect(mockGetDashboardId).toHaveBeenCalledWith(sampleType);
    });
  });

  describe('integration scenarios', () => {
    it('should handle full import and delete workflow', async () => {
      const sampleType = DatasetSampleType.elasticsearch;

      mockSoImporter.import.mockResolvedValue({
        success: true,
        successCount: 3,
        errors: [],
        successResults: [],
        warnings: [],
      });

      const importResult = await savedObjectsManager.importSavedObjects(mockSoImporter, sampleType);
      expect(importResult.dashboardId).toBe('test-dashboard-id');

      mockSoClient.delete.mockResolvedValue({} as any);
      const deleteResult = await savedObjectsManager.deleteSavedObjects(mockSoClient, sampleType);
      expect(deleteResult).toBe(3);
    });
  });
});
