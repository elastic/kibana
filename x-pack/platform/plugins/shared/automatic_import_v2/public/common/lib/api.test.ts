/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import {
  getInstalledPackages,
  createIntegration,
  getIntegrationById,
  FLEET_PACKAGES_PATH,
  AUTOMATIC_IMPORT_INTEGRATIONS_PATH,
} from './api';

describe('API functions', () => {
  let mockHttp: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    mockHttp = httpServiceMock.createStartContract();
    jest.clearAllMocks();
  });

  describe('getInstalledPackages', () => {
    it('should call the correct endpoint with headers', async () => {
      const mockResponse = {
        items: [{ id: 'package-1', type: 'integration' }],
      };
      mockHttp.get.mockResolvedValue(mockResponse);

      const result = await getInstalledPackages({ http: mockHttp });

      expect(mockHttp.get).toHaveBeenCalledWith(FLEET_PACKAGES_PATH, {
        headers: { 'Elastic-Api-Version': '2023-10-31' },
        query: { prerelease: true },
        signal: undefined,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should pass abort signal when provided', async () => {
      mockHttp.get.mockResolvedValue({ items: [] });
      const abortController = new AbortController();

      await getInstalledPackages({ http: mockHttp, abortSignal: abortController.signal });

      expect(mockHttp.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: abortController.signal })
      );
    });

    it('should propagate errors', async () => {
      const error = new Error('Network error');
      mockHttp.get.mockRejectedValue(error);

      await expect(getInstalledPackages({ http: mockHttp })).rejects.toThrow('Network error');
    });
  });

  describe('createIntegration', () => {
    it('should call the correct endpoint with serialized body', async () => {
      const mockResponse = { integration_id: 'test-id' };
      mockHttp.put.mockResolvedValue(mockResponse);

      const request = {
        connectorId: 'connector-123',
        integrationId: 'integration-456',
        title: 'My Integration',
        description: 'Test description',
      };

      const result = await createIntegration({ http: mockHttp, ...request });

      expect(mockHttp.put).toHaveBeenCalledWith(AUTOMATIC_IMPORT_INTEGRATIONS_PATH, {
        version: '1',
        body: JSON.stringify(request),
        signal: undefined,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should include optional logo when provided', async () => {
      mockHttp.put.mockResolvedValue({ integration_id: 'test-id' });

      const request = {
        connectorId: 'connector-123',
        integrationId: 'integration-456',
        title: 'My Integration',
        description: 'Test description',
        logo: 'base64-encoded-logo',
      };

      await createIntegration({ http: mockHttp, ...request });

      expect(mockHttp.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"logo":"base64-encoded-logo"'),
        })
      );
    });

    it('should include dataStreams when provided', async () => {
      mockHttp.put.mockResolvedValue({ integration_id: 'test-id' });

      const request = {
        connectorId: 'connector-123',
        integrationId: 'integration-456',
        title: 'My Integration',
        description: 'Test description',
        dataStreams: [
          {
            dataStreamId: 'ds-1',
            title: 'Data Stream 1',
            description: 'Description',
            inputTypes: [{ name: 'filestream' as const }],
          },
        ],
      };

      await createIntegration({ http: mockHttp, ...request });

      expect(mockHttp.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"dataStreams"'),
        })
      );
    });

    it('should propagate errors', async () => {
      const error = new Error('Server error');
      mockHttp.put.mockRejectedValue(error);

      await expect(
        createIntegration({
          http: mockHttp,
          connectorId: 'c1',
          integrationId: 'i1',
          title: 'Test',
          description: 'Test',
        })
      ).rejects.toThrow('Server error');
    });
  });

  describe('getIntegrationById', () => {
    it('should call the correct endpoint with integration ID', async () => {
      const mockResponse = {
        integrationResponse: {
          integrationId: 'test-id',
          title: 'Test Integration',
        },
      };
      mockHttp.get.mockResolvedValue(mockResponse);

      const result = await getIntegrationById({
        http: mockHttp,
        integrationId: 'test-id',
      });

      expect(mockHttp.get).toHaveBeenCalledWith(`${AUTOMATIC_IMPORT_INTEGRATIONS_PATH}/test-id`, {
        version: '1',
        signal: undefined,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should URL encode the integration ID', async () => {
      mockHttp.get.mockResolvedValue({});

      await getIntegrationById({
        http: mockHttp,
        integrationId: 'integration-id',
      });

      expect(mockHttp.get).toHaveBeenCalledWith(
        `${AUTOMATIC_IMPORT_INTEGRATIONS_PATH}/integration-id`,
        expect.any(Object)
      );
    });

    it('should pass abort signal when provided', async () => {
      mockHttp.get.mockResolvedValue({});
      const abortController = new AbortController();

      await getIntegrationById({
        http: mockHttp,
        integrationId: 'test-id',
        abortSignal: abortController.signal,
      });

      expect(mockHttp.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: abortController.signal })
      );
    });

    it('should propagate errors', async () => {
      const error = new Error('Not found');
      mockHttp.get.mockRejectedValue(error);

      await expect(
        getIntegrationById({ http: mockHttp, integrationId: 'missing-id' })
      ).rejects.toThrow('Not found');
    });
  });
});
