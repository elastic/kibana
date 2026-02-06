/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';

import { getScopedClient } from './get_scoped_client';
import { uiamServiceMock } from '../uiam/uiam_service.mock';

describe('getScopedClient', () => {
  let mockClusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;
  let mockScopedClusterClient: ReturnType<
    typeof elasticsearchServiceMock.createScopedClusterClient
  >;

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClusterClient);
  });

  describe('when uiam is not provided', () => {
    it('returns a scoped client using a real request directly', () => {
      const request = httpServerMock.createKibanaRequest();

      const result = getScopedClient(request, mockClusterClient);

      expect(mockClusterClient.asScoped).toHaveBeenCalledWith(request);
      expect(result).toBe(mockScopedClusterClient);
    });

    it('returns a scoped client using a fake request directly', () => {
      const request = httpServerMock.createFakeKibanaRequest({});

      const result = getScopedClient(request, mockClusterClient);

      expect(mockClusterClient.asScoped).toHaveBeenCalledWith(request);
      expect(result).toBe(mockScopedClusterClient);
    });
  });

  describe('when uiam is provided', () => {
    describe('with a real request', () => {
      it('returns a scoped client using the request directly', () => {
        const request = httpServerMock.createKibanaRequest();
        const mockUiam = uiamServiceMock.create();

        const result = getScopedClient(request, mockClusterClient, mockUiam);

        expect(mockClusterClient.asScoped).toHaveBeenCalledWith(request);
        expect(mockUiam.getEsClientAuthenticationHeader).not.toHaveBeenCalled();
        expect(result).toBe(mockScopedClusterClient);
      });

      it('returns a scoped client using the request directly even with UIAM credentials', () => {
        const request = httpServerMock.createKibanaRequest({
          headers: {
            authorization: 'ApiKey essu_credential_123',
          },
        });
        const mockUiam = uiamServiceMock.create();

        const result = getScopedClient(request, mockClusterClient, mockUiam);

        // Real requests always use the request directly, even with UIAM credentials
        expect(mockClusterClient.asScoped).toHaveBeenCalledWith(request);
        expect(mockUiam.getEsClientAuthenticationHeader).not.toHaveBeenCalled();
        expect(result).toBe(mockScopedClusterClient);
      });
    });

    describe('with a fake request', () => {
      it('returns a scoped client using the request directly when fake request has no authorization header', () => {
        const request = httpServerMock.createFakeKibanaRequest({
          headers: {},
        });
        const mockUiam = uiamServiceMock.create();

        const result = getScopedClient(request, mockClusterClient, mockUiam);

        expect(mockClusterClient.asScoped).toHaveBeenCalledWith(request);
        expect(mockUiam.getEsClientAuthenticationHeader).not.toHaveBeenCalled();
        expect(result).toBe(mockScopedClusterClient);
      });

      it('returns a scoped client using the request directly when fake request has non-UIAM credentials', () => {
        const request = httpServerMock.createFakeKibanaRequest({
          headers: {
            authorization: 'ApiKey regular_credential_123',
          },
        });
        const mockUiam = uiamServiceMock.create();

        const result = getScopedClient(request, mockClusterClient, mockUiam);

        expect(mockClusterClient.asScoped).toHaveBeenCalledWith(request);
        expect(mockUiam.getEsClientAuthenticationHeader).not.toHaveBeenCalled();
        expect(result).toBe(mockScopedClusterClient);
      });

      it('returns a scoped client with UIAM authentication header when fake request has UIAM credentials', () => {
        const request = httpServerMock.createFakeKibanaRequest({
          headers: {
            authorization: 'ApiKey essu_credential_123',
          },
        });
        const mockUiam = uiamServiceMock.create();

        const result = getScopedClient(request, mockClusterClient, mockUiam);

        expect(mockUiam.getEsClientAuthenticationHeader).toHaveBeenCalled();
        expect(mockClusterClient.asScoped).toHaveBeenCalledWith({
          headers: {
            authorization: 'ApiKey essu_credential_123',
            ...mockUiam.getEsClientAuthenticationHeader(),
          },
        });
        expect(result).toBe(mockScopedClusterClient);
      });
    });
  });
});
