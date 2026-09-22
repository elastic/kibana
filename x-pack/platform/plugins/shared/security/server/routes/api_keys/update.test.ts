/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { Type } from '@kbn/config-schema';
import type { RequestHandler, RouteValidatorConfig } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';

import { defineUpdateApiKeyRoutes } from './update';
import type { InternalAuthenticationServiceStart } from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

describe('Update API Key route', () => {
  function getMockContext(
    licenseCheckResult: { state: string; message?: string } = { state: 'valid' }
  ) {
    return coreMock.createCustomRequestHandlerContext({
      licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } },
    });
  }

  let routeHandler: RequestHandler<any, any, any, any>;

  let bodyValidation: Type<unknown>;

  let authc: DeeplyMockedKeys<InternalAuthenticationServiceStart>;

  beforeEach(() => {
    authc = authenticationServiceMock.createStart();

    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();

    mockRouteDefinitionParams.getAuthenticationService.mockReturnValue(authc);

    defineUpdateApiKeyRoutes(mockRouteDefinitionParams);

    const [apiKeyRouteConfig, apiKeyRouteHandler] =
      mockRouteDefinitionParams.router.put.mock.calls.find(
        ([{ path }]) => path === '/internal/security/api_key'
      )!;
    routeHandler = apiKeyRouteHandler;
    bodyValidation = (apiKeyRouteConfig.validate as RouteValidatorConfig<{}, {}, {}>)
      .body as Type<unknown>;
  });

  describe('payload validation', () => {
    it('accepts a REST API key payload', () => {
      expect(() =>
        bodyValidation.validate({
          id: 'test_id',
          expiration: '12d',
          role_descriptors: { role_1: {} },
          metadata: { foo: 'bar' },
        })
      ).not.toThrow();
    });

    it('accepts a cross-cluster API key payload', () => {
      expect(() =>
        bodyValidation.validate({
          id: 'test_id',
          type: 'cross_cluster',
          access: {
            search: [{ names: ['logs*'] }],
            replication: [{ names: ['logs*'] }],
          },
        })
      ).not.toThrow();
    });

    it('rejects an id longer than 256 characters', () => {
      expect(() => bodyValidation.validate({ id: 'a'.repeat(257), role_descriptors: {} })).toThrow(
        /value has length \[257\] but it must have a maximum length of \[256\]/
      );
    });

    it('rejects an expiration longer than 64 characters', () => {
      expect(() =>
        bodyValidation.validate({
          id: 'test_id',
          expiration: '1'.repeat(65),
          role_descriptors: {},
        })
      ).toThrow(/value has length \[65\] but it must have a maximum length of \[64\]/);
    });

    it('rejects a role descriptor name longer than 1024 characters', () => {
      expect(() =>
        bodyValidation.validate({
          id: 'test_id',
          role_descriptors: { ['r'.repeat(1025)]: {} },
        })
      ).toThrow(/value has length \[1025\] but it must have a maximum length of \[1024\]/);
    });

    it('rejects a cross-cluster index name expression longer than 4096 characters', () => {
      expect(() =>
        bodyValidation.validate({
          id: 'test_id',
          type: 'cross_cluster',
          access: { search: [{ names: ['l'.repeat(4097)] }] },
        })
      ).toThrow(/value has length \[4097\] but it must have a maximum length of \[4096\]/);
    });
  });

  describe('failure', () => {
    it('returns result of license checker', async () => {
      const mockContext = getMockContext({ state: 'invalid', message: 'test forbidden message' });

      const response = await routeHandler(
        mockContext,
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(403);
      expect(response.payload).toEqual({ message: 'test forbidden message' });
      expect((await mockContext.licensing).license.check).toHaveBeenCalledWith('security', 'basic');
    });

    it('returns error from cluster client', async () => {
      const error = Boom.notAcceptable('test not acceptable message');
      authc.apiKeys.update.mockRejectedValue(error);

      const response = await routeHandler(
        getMockContext(),
        httpServerMock.createKibanaRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(406);
      expect(response.payload).toEqual(error);
    });
  });

  describe('success', () => {
    it('allows an API Key to be updated', async () => {
      authc.apiKeys.update.mockResolvedValue({
        updated: true,
      });

      const payload = {
        id: 'test_id',
        role_descriptors: {
          role_1: {},
        },
        metadata: {
          foo: 'bar',
        },
      };

      const request = httpServerMock.createKibanaRequest({
        body: {
          ...payload,
        },
      });

      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);

      expect(authc.apiKeys.update).toHaveBeenCalledWith(request, payload);
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        updated: true,
      });
    });

    it('returns a message if API Keys are disabled', async () => {
      authc.apiKeys.update.mockResolvedValue(null);

      const payload = {
        id: 'test_id',
        metadata: {},
        role_descriptors: {
          role_1: {},
        },
      };

      const request = httpServerMock.createKibanaRequest({
        body: {
          ...payload,
        },
      });

      const response = await routeHandler(getMockContext(), request, kibanaResponseFactory);

      expect(authc.apiKeys.update).toHaveBeenCalledWith(request, payload);
      expect(response.status).toBe(400);
      expect(response.payload).toEqual({
        message: 'API Keys are not available',
      });
    });
  });
});
