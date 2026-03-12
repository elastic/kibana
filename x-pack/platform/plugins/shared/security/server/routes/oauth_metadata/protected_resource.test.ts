/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';

import { defineOAuthProtectedResourceRoute } from './protected_resource';
import { routeDefinitionParamsMock, securityRequestHandlerContextMock } from '../index.mock';

describe('GET /.well-known/oauth-protected-resource', () => {
  it('does not register the route when mcp config is not set', () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    defineOAuthProtectedResourceRoute(mockRouteDefinitionParams);

    expect(mockRouteDefinitionParams.router.get).not.toHaveBeenCalled();
  });

  describe('when mcp config is set', () => {
    const mcpConfig = {
      mcp: {
        oauth2: {
          metadata: {
            authorization_servers: ['https://auth.example.com'],
          },
        },
      },
    };

    it('registers the route', () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create(mcpConfig, {
        serverless: true,
      });
      defineOAuthProtectedResourceRoute(mockRouteDefinitionParams);

      expect(mockRouteDefinitionParams.router.get).toHaveBeenCalledTimes(1);
      const [[routeConfig]] = mockRouteDefinitionParams.router.get.mock.calls;
      expect(routeConfig.path).toBe('/.well-known/oauth-protected-resource');
      expect(routeConfig.security?.authc).toEqual({
        enabled: false,
        reason: expect.any(String),
      });
      expect(routeConfig.security?.authz).toEqual({
        enabled: false,
        reason: expect.any(String),
      });
    });

    it('returns only authorization_servers when no optional fields are set', async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create(mcpConfig, {
        serverless: true,
      });
      defineOAuthProtectedResourceRoute(mockRouteDefinitionParams);

      const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;
      const mockContext = securityRequestHandlerContextMock.create();
      const mockRequest = httpServerMock.createKibanaRequest({ method: 'get' });

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        authorization_servers: ['https://auth.example.com'],
      });
    });

    it('returns all configured metadata fields', async () => {
      const fullMcpConfig = {
        mcp: {
          oauth2: {
            metadata: {
              authorization_servers: ['https://auth1.example.com', 'https://auth2.example.com'],
              resource: 'https://kibana.example.com',
              bearer_methods_supported: ['header'] as const,
              scopes_supported: ['read', 'write'],
              resource_documentation: 'https://docs.example.com',
            },
          },
        },
      };

      const mockRouteDefinitionParams = routeDefinitionParamsMock.create(fullMcpConfig, {
        serverless: true,
      });
      defineOAuthProtectedResourceRoute(mockRouteDefinitionParams);

      const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;
      const mockContext = securityRequestHandlerContextMock.create();
      const mockRequest = httpServerMock.createKibanaRequest({ method: 'get' });

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        authorization_servers: ['https://auth1.example.com', 'https://auth2.example.com'],
        resource: 'https://kibana.example.com',
        bearer_methods_supported: ['header'],
        scopes_supported: ['read', 'write'],
        resource_documentation: 'https://docs.example.com',
      });
    });
  });
});
