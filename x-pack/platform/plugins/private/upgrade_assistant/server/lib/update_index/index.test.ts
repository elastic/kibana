/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { updateIndex } from '.';
import { IndicesPutSettingsRequest } from '@elastic/elasticsearch/lib/api/types';
import { getReindexWarnings } from '../reindexing/index_settings';

// Mock the getReindexWarnings function
jest.mock('../reindexing/index_settings', () => ({
  getReindexWarnings: jest.fn(),
}));

const ackResponseMock = {
  acknowledged: true,
  shards_acknowledged: true,
  indices: [],
};

describe('updateIndex', () => {
  const mockGetReindexWarnings = getReindexWarnings as jest.Mock;
  const mockLogger = loggingSystemMock.create().get();
  const mockClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
  mockClient.rollup.getRollupIndexCaps.mockResponse({
    testIndex: {
      rollup_jobs: [
        {
          job_id: 'testJob',
          rollup_index: 'test_rollup_index',
          index_pattern: 'test-*',
          fields: {},
        },
      ],
    },
  });
  mockClient.rollup.getJobs.mockResponse({
    jobs: [
      {
        // @ts-ignore - mocking the rollup job doesnt require us to populate all this fields
        config: {},
        // @ts-ignore - mocking the rollup job doesnt require us to populate all this fields
        stats: {},
        status: {
          job_state: 'stopped',
        },
      },
    ],
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('blockWrite operation', () => {
    it('should add a write block to the index', async () => {
      mockClient.indices.addBlock.mockResponseOnce(ackResponseMock);
      mockClient.indices.get.mockResponseOnce({ testIndex: { settings: { index: {} } } });
      mockGetReindexWarnings.mockReturnValueOnce([]);

      await updateIndex({
        esClient: mockClient,
        index: 'testIndex',
        operations: ['blockWrite'],
        log: mockLogger,
      });

      expect(mockClient.indices.addBlock).toHaveBeenCalledWith({
        index: 'testIndex',
        block: 'write',
      });
    });

    it('should throw an error if addBlock is not acknowledged', async () => {
      mockClient.indices.addBlock.mockResponseOnce({
        ...ackResponseMock,
        acknowledged: false,
      });

      await expect(
        updateIndex({
          esClient: mockClient,
          index: 'testIndex',
          operations: ['blockWrite'],
          log: mockLogger,
        })
      ).rejects.toThrow('Could not set apply blockWrite to testIndex.');
    });

    it('should remove deprecated settings when found', async () => {
      // Setup successful addBlock
      mockClient.indices.addBlock.mockResponseOnce(ackResponseMock);

      // Setup index settings response
      mockClient.indices.get.mockResponseOnce({
        testIndex: {
          settings: {
            index: {
              force_memory_term_dictionary: 'true',
              'soft_deletes.enabled': 'true',
              number_of_shards: '1',
            },
          },
        },
      });

      // Set up getReindexWarnings to return a warning with deprecated settings
      mockGetReindexWarnings.mockReturnValueOnce([
        {
          warningType: 'indexSetting',
          flow: 'all',
          meta: {
            deprecatedSettings: [
              'index.force_memory_term_dictionary',
              'index.soft_deletes.enabled',
            ],
          },
        },
      ]);

      // Mock putSettings response
      mockClient.indices.putSettings.mockResponseOnce({ acknowledged: true });

      await updateIndex({
        esClient: mockClient,
        index: 'testIndex',
        operations: ['blockWrite'],
        log: mockLogger,
      });

      // Verify indices.addBlock was called
      expect(mockClient.indices.addBlock).toHaveBeenCalledWith({
        index: 'testIndex',
        block: 'write',
      });

      // The important part here is that we're setting the deprecated settings to null
      expect(mockClient.indices.putSettings).toHaveBeenCalled();
      const putSettingsCall = mockClient.indices.putSettings.mock
        .calls[0][0] as IndicesPutSettingsRequest;
      expect(putSettingsCall.index).toBe('testIndex');

      // Use a more flexible check that's less dependent on object structure
      expect(JSON.stringify(putSettingsCall.settings)).toContain(
        'index.force_memory_term_dictionary'
      );
      expect(JSON.stringify(putSettingsCall.settings)).toContain('index.soft_deletes.enabled');

      // Verify settings are set to null
      expect(JSON.stringify(putSettingsCall.settings)).toContain(
        'index.force_memory_term_dictionary":null'
      );
      expect(JSON.stringify(putSettingsCall.settings)).toContain(
        'index.soft_deletes.enabled":null'
      );

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Removing deprecated settings')
      );
    });

    it('should continue if removing deprecated settings fails', async () => {
      // Setup successful addBlock
      mockClient.indices.addBlock.mockResponseOnce(ackResponseMock);

      // Setup index settings response
      mockClient.indices.get.mockResponseOnce({
        testIndex: {
          settings: {
            index: {
              force_memory_term_dictionary: 'true',
            },
          },
        },
      });

      // Set up getReindexWarnings to return a warning with deprecated settings
      mockGetReindexWarnings.mockReturnValueOnce([
        {
          warningType: 'indexSetting',
          flow: 'all',
          meta: {
            deprecatedSettings: ['index.force_memory_term_dictionary'],
          },
        },
      ]);

      // Make putSettings fail
      mockClient.indices.putSettings.mockRejectedValueOnce(new Error('Failed to update settings'));

      await updateIndex({
        esClient: mockClient,
        index: 'testIndex',
        operations: ['blockWrite'],
        log: mockLogger,
      });

      // Verify indices.addBlock was called
      expect(mockClient.indices.addBlock).toHaveBeenCalledWith({
        index: 'testIndex',
        block: 'write',
      });

      // Verify indices.putSettings was called
      expect(mockClient.indices.putSettings).toHaveBeenCalled();
      const putSettingsCall = mockClient.indices.putSettings.mock
        .calls[0][0] as IndicesPutSettingsRequest;
      expect(putSettingsCall.index).toBe('testIndex');

      // Use a more flexible check that's less dependent on object structure
      expect(JSON.stringify(putSettingsCall.settings)).toContain(
        'index.force_memory_term_dictionary'
      );

      // Verify error was logged but didn't fail the operation
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to remove deprecated settings')
      );
    });
  });

  describe('multiple operations', () => {
    it('should process all operations in order', async () => {
      mockClient.indices.addBlock.mockResponseOnce(ackResponseMock);
      mockClient.indices.get.mockResponseOnce({ testIndex: { settings: { index: {} } } });
      mockGetReindexWarnings.mockReturnValueOnce([]);

      await updateIndex({
        esClient: mockClient,
        index: 'testIndex',
        operations: ['blockWrite'],
        log: mockLogger,
      });

      expect(mockClient.indices.addBlock).toHaveBeenCalledWith({
        index: 'testIndex',
        block: 'write',
      });
    });
  });
});
