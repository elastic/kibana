/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/logging';

import { UiamOAuth } from './uiam_oauth';
import type { SecurityLicense } from '../../../common';
import { licenseMock } from '../../../common/licensing/index.mock';
import type { UiamServicePublic } from '../../uiam';
import { uiamServiceMock } from '../../uiam/uiam_service.mock';

describe('UiamOAuth', () => {
  let uiamOAuth: UiamOAuth;
  let mockLicense: jest.Mocked<SecurityLicense>;
  let mockUiam: jest.Mocked<UiamServicePublic>;
  let logger: Logger;

  const createMockRequest = (authHeader?: string): KibanaRequest => {
    return httpServerMock.createKibanaRequest({
      headers: authHeader ? { authorization: authHeader } : {},
    });
  };

  beforeEach(() => {
    mockLicense = licenseMock.create();
    mockLicense.isEnabled.mockReturnValue(true);
    logger = loggingSystemMock.create().get('oauth-uiam');
    mockUiam = uiamServiceMock.create();

    uiamOAuth = new UiamOAuth({
      logger,
      license: mockLicense,
      uiam: mockUiam,
    });
  });

  describe('createClient()', () => {
    it('returns null when license is not enabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const request = createMockRequest('Bearer essu_token');

      const result = await uiamOAuth.createClient(request, {
        resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
      });

      expect(result).toBeNull();
      expect(mockUiam.createOAuthClient).not.toHaveBeenCalled();
    });

    it('creates an OAuth client successfully', async () => {
      const mockResponse = {
        id: 'client-id',
        resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        client_name: 'Test',
      };
      mockUiam.createOAuthClient.mockResolvedValue(mockResponse);
      const request = createMockRequest('Bearer essu_access_token');

      const result = await uiamOAuth.createClient(request, {
        resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        client_name: 'Test',
      });

      expect(result).toEqual(mockResponse);
      expect(mockUiam.createOAuthClient).toHaveBeenCalledWith('essu_access_token', {
        resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        client_name: 'Test',
      });
    });

    it('forwards logo, metadata, and redirect_uris when provided', async () => {
      const mockResponse = {
        id: 'client-id',
        resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        client_name: 'Test',
        redirect_uris: ['https://example.com/cb'],
        client_logo: { media_type: 'image/png', data: 'abc' },
      };
      mockUiam.createOAuthClient.mockResolvedValue(mockResponse);
      const request = createMockRequest('Bearer essu_access_token');

      const params = {
        resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        client_name: 'Test',
        client_type: 'confidential' as const,
        client_metadata: { owner: 'admin' },
        client_logo: { media_type: 'image/png', data: 'abc' },
        redirect_uris: ['https://example.com/cb'],
      };

      const result = await uiamOAuth.createClient(request, params);

      expect(result).toEqual(mockResponse);
      expect(mockUiam.createOAuthClient).toHaveBeenCalledWith('essu_access_token', params);
    });

    it('logs and throws error when UIAM call fails', async () => {
      mockUiam.createOAuthClient.mockRejectedValue(new Error('UIAM error'));
      const request = createMockRequest('Bearer essu_access_token');

      await expect(
        uiamOAuth.createClient(request, {
          resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        })
      ).rejects.toThrow('UIAM error');

      expect(logger.error).toHaveBeenCalledWith('Failed to create OAuth client: UIAM error');
    });
  });

  describe('listClients()', () => {
    it('returns null when license is not enabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const request = createMockRequest('Bearer essu_token');

      const result = await uiamOAuth.listClients(request);

      expect(result).toBeNull();
    });

    it('lists clients successfully', async () => {
      const mockResponse = {
        clients: [{ id: 'c1', resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud' }],
      };
      mockUiam.listOAuthClients.mockResolvedValue(mockResponse);
      const request = createMockRequest('Bearer essu_access_token');

      const result = await uiamOAuth.listClients(request, 'c1');

      expect(result).toEqual(mockResponse);
      expect(mockUiam.listOAuthClients).toHaveBeenCalledWith('essu_access_token', 'c1');
    });
  });

  describe('updateClient()', () => {
    it('returns null when license is not enabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const request = createMockRequest('Bearer essu_token');

      const result = await uiamOAuth.updateClient(request, 'c1', { client_metadata: {} });

      expect(result).toBeNull();
    });

    it('updates client successfully', async () => {
      const mockResponse = {
        id: 'c1',
        resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        client_name: 'Updated',
      };
      mockUiam.updateOAuthClient.mockResolvedValue(mockResponse);
      const request = createMockRequest('Bearer essu_access_token');

      const result = await uiamOAuth.updateClient(request, 'c1', {
        client_name: 'Updated',
        client_metadata: { k: 'v' },
      });

      expect(result).toEqual(mockResponse);
      expect(mockUiam.updateOAuthClient).toHaveBeenCalledWith('essu_access_token', 'c1', {
        client_name: 'Updated',
        client_metadata: { k: 'v' },
      });
    });

    it('forwards redirect_uris replacement to UIAM', async () => {
      const mockResponse = {
        id: 'c1',
        resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        redirect_uris: ['https://new.example/cb'],
      };
      mockUiam.updateOAuthClient.mockResolvedValue(mockResponse);
      const request = createMockRequest('Bearer essu_access_token');

      const params = {
        client_metadata: {},
        redirect_uris: ['https://new.example/cb'],
      };

      const result = await uiamOAuth.updateClient(request, 'c1', params);

      expect(result).toEqual(mockResponse);
      expect(mockUiam.updateOAuthClient).toHaveBeenCalledWith('essu_access_token', 'c1', params);
    });
  });

  describe('revokeClient()', () => {
    it('returns null when license is not enabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const request = createMockRequest('Bearer essu_token');

      const result = await uiamOAuth.revokeClient(request, 'c1');

      expect(result).toBeNull();
    });

    it('revokes client successfully', async () => {
      const mockResponse = {
        id: 'c1',
        resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        revoked: true,
      };
      mockUiam.revokeOAuthClient.mockResolvedValue(mockResponse);
      const request = createMockRequest('Bearer essu_access_token');

      const result = await uiamOAuth.revokeClient(request, 'c1', 'done');

      expect(result).toEqual(mockResponse);
      expect(mockUiam.revokeOAuthClient).toHaveBeenCalledWith('essu_access_token', 'c1', 'done');
    });
  });

  describe('listConnections()', () => {
    it('returns null when license is not enabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const request = createMockRequest('Bearer essu_token');

      const result = await uiamOAuth.listConnections(request);

      expect(result).toBeNull();
    });

    it('lists connections successfully', async () => {
      const mockResponse = {
        connections: [
          {
            id: 'conn1',
            client_id: 'c1',
            resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
          },
        ],
      };
      mockUiam.listOAuthConnections.mockResolvedValue(mockResponse);
      const request = createMockRequest('Bearer essu_access_token');

      const result = await uiamOAuth.listConnections(request, 'c1', 'conn1');

      expect(result).toEqual(mockResponse);
      expect(mockUiam.listOAuthConnections).toHaveBeenCalledWith(
        'essu_access_token',
        'c1',
        'conn1'
      );
    });
  });

  describe('updateConnection()', () => {
    it('returns null when license is not enabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const request = createMockRequest('Bearer essu_token');

      const result = await uiamOAuth.updateConnection(request, 'c1', 'conn1', { name: 'New' });

      expect(result).toBeNull();
      expect(mockUiam.updateOAuthConnection).not.toHaveBeenCalled();
    });

    it('updates connection successfully', async () => {
      const mockResponse = {
        id: 'conn1',
        client_id: 'c1',
        resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        name: 'New name',
      };
      mockUiam.updateOAuthConnection.mockResolvedValue(mockResponse);
      const request = createMockRequest('Bearer essu_access_token');

      const result = await uiamOAuth.updateConnection(request, 'c1', 'conn1', {
        name: 'New name',
      });

      expect(result).toEqual(mockResponse);
      expect(mockUiam.updateOAuthConnection).toHaveBeenCalledWith(
        'essu_access_token',
        'c1',
        'conn1',
        { name: 'New name' }
      );
    });

    it('logs and throws error when UIAM call fails', async () => {
      mockUiam.updateOAuthConnection.mockRejectedValue(new Error('UIAM error'));
      const request = createMockRequest('Bearer essu_access_token');

      await expect(
        uiamOAuth.updateConnection(request, 'c1', 'conn1', { name: 'x' })
      ).rejects.toThrow('UIAM error');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to update OAuth connection conn1: UIAM error'
      );
    });
  });

  describe('revokeConnection()', () => {
    it('returns null when license is not enabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const request = createMockRequest('Bearer essu_token');

      const result = await uiamOAuth.revokeConnection(request, 'c1', 'conn1');

      expect(result).toBeNull();
    });

    it('revokes connection successfully', async () => {
      const mockResponse = {
        id: 'conn1',
        client_id: 'c1',
        resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        revoked: true,
      };
      mockUiam.revokeOAuthConnection.mockResolvedValue(mockResponse);
      const request = createMockRequest('Bearer essu_access_token');

      const result = await uiamOAuth.revokeConnection(request, 'c1', 'conn1', 'reason');

      expect(result).toEqual(mockResponse);
      expect(mockUiam.revokeOAuthConnection).toHaveBeenCalledWith(
        'essu_access_token',
        'c1',
        'conn1',
        'reason'
      );
    });
  });

  describe('getAccessToken()', () => {
    it('extracts UIAM access token from request', () => {
      const request = createMockRequest('Bearer essu_my_token');

      expect(UiamOAuth.getAccessToken(request)).toBe('essu_my_token');
    });

    it('throws when authorization header is missing', () => {
      const request = createMockRequest();

      expect(() => UiamOAuth.getAccessToken(request)).toThrow(
        'Request does not contain an authorization header'
      );
    });

    it('throws when credential is not a UIAM credential', () => {
      const request = createMockRequest('Bearer regular_token');

      expect(() => UiamOAuth.getAccessToken(request)).toThrow(
        'Provided credential is not compatible with UIAM'
      );
    });
  });
});
