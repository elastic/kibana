/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { RequestHandler } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import type { UiamOAuthType } from '@kbn/core-security-server';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';

import { defineCreateOAuthClientRoute } from './create_client';
import { createClientBodySchema } from './schemas';
import type { InternalAuthenticationServiceStart } from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

const RESOURCE = 'https://test-project.kb.us-central1.gcp.elastic.cloud/api/agent_builder/mcp';
const PROJECT_ID = 'mock-project-id';

const mcpConfig = {
  mcp: {
    oauth2: {
      metadata: {
        authorization_servers: ['https://auth.example.com'],
        resource: RESOURCE,
      },
    },
  },
};

describe('Create OAuth Client route', () => {
  function getMockContext(
    licenseCheckResult: { state: string; message?: string } = { state: 'valid' }
  ) {
    const coreContext = coreMock.createRequestHandlerContext();
    return coreMock.createCustomRequestHandlerContext({
      core: coreContext,
      licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } },
    });
  }

  function setup(
    rawConfig: Record<string, unknown> = mcpConfig,
    options: { serverlessProjectId?: string } = {}
  ) {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create(rawConfig, {
      serverless: true,
    });
    mockRouteDefinitionParams.serverlessProjectId =
      'serverlessProjectId' in options ? options.serverlessProjectId : PROJECT_ID;
    const authcMock = authenticationServiceMock.createStart();
    mockRouteDefinitionParams.getAuthenticationService.mockReturnValue(authcMock);

    defineCreateOAuthClientRoute(mockRouteDefinitionParams);

    const [, handler] = mockRouteDefinitionParams.router.post.mock.calls.find(
      ([{ path }]) => path === '/internal/security/oauth/clients'
    )!;

    return {
      routeHandler: handler as RequestHandler<any, any, any, any>,
      authc: authcMock,
      oauthMock: authcMock.oauth as jest.Mocked<UiamOAuthType>,
    };
  }

  let routeHandler: RequestHandler<any, any, any, any>;
  let authc: DeeplyMockedKeys<InternalAuthenticationServiceStart>;
  let oauthMock: jest.Mocked<UiamOAuthType>;

  beforeEach(() => {
    ({ routeHandler, authc, oauthMock } = setup());
  });

  it('returns result of license checker', async () => {
    const mockContext = getMockContext({ state: 'invalid', message: 'test forbidden message' });
    const response = await routeHandler(
      mockContext,
      httpServerMock.createKibanaRequest(),
      kibanaResponseFactory
    );

    expect(response.status).toBe(403);
    expect(response.payload).toEqual({ message: 'test forbidden message' });
  });

  it('injects the configured resource and serverless project id and returns the created client on success', async () => {
    const mockClient = {
      id: 'client-1',
      resource: RESOURCE,
      client_name: 'Test',
    };
    oauthMock.createClient.mockResolvedValue(mockClient);

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        body: { client_name: 'Test' },
      }),
      kibanaResponseFactory
    );

    expect(oauthMock.createClient).toHaveBeenCalledWith(expect.anything(), {
      client_name: 'Test',
      resource: RESOURCE,
      project_id: PROJECT_ID,
    });
    expect(response.status).toBe(200);
    expect(response.payload).toEqual(mockClient);
  });

  it('rejects unknown body fields (including `resource`) at the schema layer', () => {
    expect(() =>
      createClientBodySchema.validate({
        client_name: 'Test',
        resource: 'https://attacker.example.com',
      })
    ).toThrow(/resource/);
  });

  it('rejects a body-supplied `project_id` at the schema layer', () => {
    expect(() =>
      createClientBodySchema.validate({ client_name: 'Test', project_id: 'attacker-project' })
    ).toThrow(/project_id/);
  });

  describe('client_name length validation aligned with UIAM (128)', () => {
    it('accepts a client_name at the 128-character limit', () => {
      expect(() => createClientBodySchema.validate({ client_name: 'a'.repeat(128) })).not.toThrow();
    });

    it('rejects a client_name over the 128-character limit', () => {
      expect(() => createClientBodySchema.validate({ client_name: 'a'.repeat(129) })).toThrow(
        /client_name/
      );
    });
  });

  describe('redirect_uris size validation aligned with UIAM (1-20)', () => {
    const uri = 'https://example.com/cb';

    it('rejects an empty redirect_uris array', () => {
      expect(() =>
        createClientBodySchema.validate({ client_name: 'Test', redirect_uris: [] })
      ).toThrow(/redirect_uris/);
    });

    it('accepts 20 redirect URIs', () => {
      expect(() =>
        createClientBodySchema.validate({
          client_name: 'Test',
          redirect_uris: Array.from({ length: 20 }, () => uri),
        })
      ).not.toThrow();
    });

    it('rejects 21 redirect URIs', () => {
      expect(() =>
        createClientBodySchema.validate({
          client_name: 'Test',
          redirect_uris: Array.from({ length: 21 }, () => uri),
        })
      ).toThrow(/redirect_uris/);
    });
  });

  it('overrides any body-supplied `resource` with the configured value as defense-in-depth', async () => {
    oauthMock.createClient.mockResolvedValue({ id: 'client-1', resource: RESOURCE });

    // Bypass schema validation by handing the handler an "already validated" body
    // that still contains a `resource` field; the handler must not honor it.
    await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        body: { client_name: 'Test', resource: 'https://attacker.example.com' },
      }),
      kibanaResponseFactory
    );

    expect(oauthMock.createClient).toHaveBeenCalledWith(expect.anything(), {
      client_name: 'Test',
      resource: RESOURCE,
      project_id: PROJECT_ID,
    });
  });

  it('overrides any body-supplied `project_id` with the serverless project id as defense-in-depth', async () => {
    oauthMock.createClient.mockResolvedValue({ id: 'client-1', resource: RESOURCE });

    // Bypass schema validation by handing the handler an "already validated" body
    // that still contains a `project_id` field; the handler must not honor it.
    await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        body: { client_name: 'Test', project_id: 'attacker-project' },
      }),
      kibanaResponseFactory
    );

    expect(oauthMock.createClient).toHaveBeenCalledWith(expect.anything(), {
      client_name: 'Test',
      resource: RESOURCE,
      project_id: PROJECT_ID,
    });
  });

  it('returns 404 when the serverless project id is not configured', async () => {
    ({ routeHandler, oauthMock } = setup(mcpConfig, { serverlessProjectId: undefined }));

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        body: { client_name: 'Test' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
    expect(oauthMock.createClient).not.toHaveBeenCalled();
  });

  it('returns 404 when OAuth is not available', async () => {
    authc.oauth = null;

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        body: { client_name: 'Test' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
  });
  it('returns 404 when MCP protected resource metadata is not configured', async () => {
    ({ routeHandler, oauthMock } = setup({}));

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        body: { client_name: 'Test' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
    expect(oauthMock.createClient).not.toHaveBeenCalled();
  });

  it('returns error from service', async () => {
    const error = Boom.badRequest('Invalid resource');
    oauthMock.createClient.mockRejectedValue(error);

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        body: { client_name: 'Test' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(400);
  });
});
