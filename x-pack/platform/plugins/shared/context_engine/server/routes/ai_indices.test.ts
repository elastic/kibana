/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { registerAiIndexRoutes } from './ai_indices';
import { aiIndexByIdPath, aiIndexPath } from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import {
  InvalidAiIndexDestError,
  AiIndexConflictError,
  AiIndexNotFoundError,
  AiIndexAlreadyExistsError,
} from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';

interface RegisteredRoute {
  config: {
    path: string;
    access: string;
    security: { authz: { requiredPrivileges: string[] } };
  };
  handler: RequestHandler;
  validate:
    | false
    | { request?: { params?: Type<unknown>; query?: Type<unknown>; body?: Type<unknown> } };
}

const aiIndexItem: AiIndexHttpItem = {
  id: 'customer_support',
  description: 'Customer support context',
  dest: { type: 'data_stream', value: 'ai-index-ds-customer_support*' },
  automations: [{ type: 'workflow', value: 'nightly-refresh' }],
  sources: [{ type: 'esql', value: 'FROM ai-index-ds-customer_support | LIMIT 10' }],
  date_created: '2026-07-08T12:10:30.000Z',
  date_modified: '2026-07-08T12:10:30.000Z',
};

describe('ai indices routes', () => {
  let routes: Record<string, RegisteredRoute>;
  let aiIndexService: jest.Mocked<
    Pick<AiIndexService, 'create' | 'put' | 'get' | 'list' | 'delete'>
  >;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let featureFlagEnabled: boolean;

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => featureFlagEnabled) },
        },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const getRoute = (method: string, path: string): RegisteredRoute => {
    const route = routes[`${method}:${path}`];
    expect(route).toBeDefined();
    return route;
  };

  beforeEach(() => {
    routes = {};
    featureFlagEnabled = true;
    response = httpServerMock.createResponseFactory();
    aiIndexService = {
      create: jest.fn(),
      put: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
      delete: jest.fn(),
    };

    const createVersionedRoute = (method: string) => (config: RegisteredRoute['config']) => ({
      addVersion: (
        versionConfig: { validate: RegisteredRoute['validate'] },
        handler: RequestHandler
      ) => {
        routes[`${method}:${config.path}`] = {
          config,
          handler,
          validate: versionConfig.validate,
        };
      },
    });

    const router = {
      versioned: {
        get: jest.fn(createVersionedRoute('GET')),
        post: jest.fn(createVersionedRoute('POST')),
        put: jest.fn(createVersionedRoute('PUT')),
        delete: jest.fn(createVersionedRoute('DELETE')),
      },
    } as unknown as IRouter;

    registerAiIndexRoutes({
      router,
      getAiIndexService: () => aiIndexService as unknown as AiIndexService,
    });
  });

  const callRoute = async (method: string, path: string, request: Record<string, unknown>) => {
    const { handler } = getRoute(method, path);
    return handler(createContext(), httpServerMock.createKibanaRequest(request), response);
  };

  it('returns 404 on every route when the context engine is disabled', async () => {
    featureFlagEnabled = false;

    await callRoute('POST', aiIndexPath, { body: { id: 'a' } });
    await callRoute('PUT', aiIndexByIdPath, { params: { aiIndexId: 'a' }, body: {} });
    await callRoute('GET', aiIndexByIdPath, { params: { aiIndexId: 'a' } });
    await callRoute('GET', aiIndexPath, {});
    await callRoute('DELETE', aiIndexByIdPath, { params: { aiIndexId: 'a' } });

    expect(response.notFound).toHaveBeenCalledTimes(5);
    expect(aiIndexService.create).not.toHaveBeenCalled();
    expect(aiIndexService.put).not.toHaveBeenCalled();
    expect(aiIndexService.get).not.toHaveBeenCalled();
    expect(aiIndexService.list).not.toHaveBeenCalled();
    expect(aiIndexService.delete).not.toHaveBeenCalled();
  });

  it('registers all routes as public with the expected privileges', () => {
    expect(getRoute('POST', aiIndexPath).config).toMatchObject({
      access: 'public',
      security: { authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] } },
    });
    expect(getRoute('PUT', aiIndexByIdPath).config).toMatchObject({
      access: 'public',
      security: { authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] } },
    });
    expect(getRoute('GET', aiIndexByIdPath).config).toMatchObject({
      access: 'public',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
    });
    expect(getRoute('GET', aiIndexPath).config).toMatchObject({
      access: 'public',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
    });
    expect(getRoute('DELETE', aiIndexByIdPath).config).toMatchObject({
      access: 'public',
      security: { authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] } },
    });
  });

  describe('POST /api/context_engine/ai_index', () => {
    const postBody = {
      id: 'customer_support',
      dest: { type: 'data_stream', value: 'ai-index-ds-customer_support*' },
      automations: [{ type: 'workflow', value: 'nightly-refresh' }],
      sources: [{ type: 'esql', value: 'FROM ai-index-ds-customer_support | LIMIT 10' }],
    };

    it('returns 201 when the AI index is created', async () => {
      aiIndexService.create.mockResolvedValue(undefined);

      await callRoute('POST', aiIndexPath, { body: postBody });

      const { id, ...properties } = postBody;
      expect(aiIndexService.create).toHaveBeenCalledWith('customer_support', properties);
      expect(response.created).toHaveBeenCalledWith({ body: { status: 'created' } });
    });

    it('returns 409 when the id already exists', async () => {
      aiIndexService.create.mockRejectedValue(new AiIndexAlreadyExistsError('customer_support'));

      await callRoute('POST', aiIndexPath, { body: postBody });

      expect(response.conflict).toHaveBeenCalledWith({
        body: { message: "AI index 'customer_support' already exists" },
      });
    });

    it('returns 400 when the dest is invalid', async () => {
      aiIndexService.create.mockRejectedValue(
        new InvalidAiIndexDestError("dest.value 'customer_support*' is not allowed")
      );

      await callRoute('POST', aiIndexPath, { body: postBody });

      expect(response.badRequest).toHaveBeenCalledWith({
        body: { message: "dest.value 'customer_support*' is not allowed" },
      });
    });
  });

  describe('PUT /api/context_engine/ai_index/{aiIndexId}', () => {
    const putRequest = {
      params: { aiIndexId: 'customer_support' },
      body: {
        dest: { type: 'data_stream', value: 'ai-index-ds-customer_support*' },
        automations: [{ type: 'workflow', value: 'nightly-refresh' }],
        sources: [{ type: 'esql', value: 'FROM ai-index-ds-customer_support | LIMIT 10' }],
      },
    };

    it('returns 201 when the AI index is created', async () => {
      aiIndexService.put.mockResolvedValue('created');

      await callRoute('PUT', aiIndexByIdPath, putRequest);

      expect(aiIndexService.put).toHaveBeenCalledWith('customer_support', putRequest.body);
      expect(response.created).toHaveBeenCalledWith({ body: { status: 'created' } });
    });

    it('returns 200 when the AI index is updated', async () => {
      aiIndexService.put.mockResolvedValue('updated');

      await callRoute('PUT', aiIndexByIdPath, putRequest);

      expect(response.ok).toHaveBeenCalledWith({ body: { status: 'updated' } });
    });

    it('returns 400 when the dest is invalid', async () => {
      aiIndexService.put.mockRejectedValue(
        new InvalidAiIndexDestError(
          "dest.value 'customer_support*' does not match any existing index, index pattern, or data stream"
        )
      );

      await callRoute('PUT', aiIndexByIdPath, putRequest);

      expect(response.badRequest).toHaveBeenCalledWith({
        body: {
          message:
            "dest.value 'customer_support*' does not match any existing index, index pattern, or data stream",
        },
      });
    });

    it('returns 409 when the AI index is modified concurrently', async () => {
      aiIndexService.put.mockRejectedValue(new AiIndexConflictError('customer_support'));

      await callRoute('PUT', aiIndexByIdPath, putRequest);

      expect(response.conflict).toHaveBeenCalledWith({
        body: { message: "AI index 'customer_support' was modified concurrently; please retry" },
      });
    });
  });

  describe('GET /api/context_engine/ai_index/{aiIndexId}', () => {
    it('returns the AI index', async () => {
      aiIndexService.get.mockResolvedValue(aiIndexItem);

      await callRoute('GET', aiIndexByIdPath, { params: { aiIndexId: 'customer_support' } });

      expect(response.ok).toHaveBeenCalledWith({ body: aiIndexItem });
    });

    it('returns 404 when the AI index does not exist', async () => {
      aiIndexService.get.mockRejectedValue(new AiIndexNotFoundError('missing'));

      await callRoute('GET', aiIndexByIdPath, { params: { aiIndexId: 'missing' } });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: "AI index 'missing' not found" },
      });
    });

    it('rethrows unexpected errors', async () => {
      aiIndexService.get.mockRejectedValue(new Error('boom'));

      await expect(
        callRoute('GET', aiIndexByIdPath, { params: { aiIndexId: 'customer_support' } })
      ).rejects.toThrow('boom');
    });
  });

  describe('GET /api/context_engine/ai_index', () => {
    it('returns the list of AI indices', async () => {
      aiIndexService.list.mockResolvedValue([]);

      await callRoute('GET', aiIndexPath, {});

      expect(response.ok).toHaveBeenCalledWith({ body: { ai_indices: [] } });
    });
  });

  describe('DELETE /api/context_engine/ai_index/{aiIndexId}', () => {
    it('returns acknowledged when the AI index is deleted', async () => {
      aiIndexService.delete.mockResolvedValue(undefined);

      await callRoute('DELETE', aiIndexByIdPath, {
        params: { aiIndexId: 'customer_support' },
      });

      expect(aiIndexService.delete).toHaveBeenCalledWith('customer_support');
      expect(response.ok).toHaveBeenCalledWith({ body: { acknowledged: true } });
    });

    it('returns 404 when the AI index does not exist', async () => {
      aiIndexService.delete.mockRejectedValue(new AiIndexNotFoundError('missing'));

      await callRoute('DELETE', aiIndexByIdPath, { params: { aiIndexId: 'missing' } });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: "AI index 'missing' not found" },
      });
    });
  });

  describe('POST body validation', () => {
    const validBody = {
      id: 'customer_support',
      dest: { type: 'data_stream', value: 'ai-index-ds-customer_support' },
      automations: [{ type: 'workflow', value: 'nightly-refresh' }],
      sources: [{ type: 'esql', value: 'FROM ai-index-ds-customer_support | LIMIT 10' }],
    };

    const validateBody = (body: Record<string, unknown>) => {
      const { validate } = getRoute('POST', aiIndexPath);
      if (!validate || !validate.request?.body) {
        throw new Error('expected a POST body schema');
      }
      return validate.request.body.validate(body);
    };

    it('accepts a valid body', () => {
      expect(() => validateBody(validBody)).not.toThrow();
    });

    it('rejects a missing id', () => {
      const { id, ...bodyWithoutId } = validBody;
      expect(() => validateBody(bodyWithoutId)).toThrow();
    });

    it('rejects an id with disallowed characters', () => {
      expect(() => validateBody({ ...validBody, id: 'Customer_Support' })).toThrow(
        /lowercase letters, numbers, hyphens/
      );
    });

    it('rejects a disallowed dest type', () => {
      expect(() =>
        validateBody({ ...validBody, dest: { type: 'view', value: 'ai-index-idx-foo' } })
      ).toThrow();
    });
  });

  describe('PUT body validation', () => {
    const validBody = {
      dest: { type: 'data_stream', value: 'ai-index-ds-customer_support' },
      automations: [{ type: 'workflow', value: 'nightly-refresh' }],
      sources: [{ type: 'esql', value: 'FROM ai-index-ds-customer_support | LIMIT 10' }],
    };

    const validateBody = (body: Record<string, unknown>) => {
      const { validate } = getRoute('PUT', aiIndexByIdPath);
      if (!validate || !validate.request?.body) {
        throw new Error('expected a PUT body schema');
      }
      return validate.request.body.validate(body);
    };

    it('accepts a valid body', () => {
      expect(() => validateBody(validBody)).not.toThrow();
    });

    it('accepts empty automations and sources arrays', () => {
      expect(() => validateBody({ ...validBody, automations: [], sources: [] })).not.toThrow();
    });

    it('accepts automations and sources with empty values', () => {
      expect(() =>
        validateBody({
          ...validBody,
          automations: [{ type: 'workflow', value: '' }],
          sources: [{ type: 'esql', value: '' }],
        })
      ).not.toThrow();
    });

    it('rejects an id in the update body', () => {
      expect(() => validateBody({ ...validBody, id: 'customer_support' })).toThrow();
    });

    it('rejects a disallowed dest type', () => {
      expect(() =>
        validateBody({ ...validBody, dest: { type: 'view', value: 'ai-index-idx-foo' } })
      ).toThrow();
    });

    it('rejects a source with a disallowed type', () => {
      expect(() =>
        validateBody({ ...validBody, sources: [{ type: 'sql', value: 'SELECT 1' }] })
      ).toThrow();
    });

    it('rejects an automation with a disallowed type', () => {
      expect(() =>
        validateBody({ ...validBody, automations: [{ type: 'cron', value: 'nightly-refresh' }] })
      ).toThrow();
    });

    it('rejects a missing automations array', () => {
      const { automations, ...bodyWithoutAutomations } = validBody;
      expect(() => validateBody(bodyWithoutAutomations)).toThrow();
    });

    it('rejects automations exceeding the max size', () => {
      const automations = Array.from({ length: 101 }, (_, i) => ({
        type: 'workflow',
        value: `workflow-${i}`,
      }));
      expect(() => validateBody({ ...validBody, automations })).toThrow();
    });

    it('rejects sources exceeding the max size', () => {
      const sources = Array.from({ length: 101 }, (_, i) => ({
        type: 'esql',
        value: `FROM index-${i}`,
      }));
      expect(() => validateBody({ ...validBody, sources })).toThrow();
    });
  });

  describe('aiIndexId param validation', () => {
    const validateParams = (params: Record<string, unknown>) => {
      const { validate } = getRoute('PUT', aiIndexByIdPath);
      if (!validate || !validate.request?.params) {
        throw new Error('expected a PUT params schema');
      }
      return validate.request.params.validate(params);
    };

    it.each(['customer_support', 'logs-app', 'index-123', 'a', '1', 'a_b-c'])(
      'accepts a valid id %p',
      (aiIndexId) => {
        expect(() => validateParams({ aiIndexId })).not.toThrow();
      }
    );

    it.each([
      'Customer_Support',
      'has space',
      'has.dot',
      'emoji😀',
      'slash/id',
      'tilde~',
      '_leading_underscore',
      '-leading-hyphen',
    ])('rejects an id with disallowed characters %p', (aiIndexId) => {
      expect(() => validateParams({ aiIndexId })).toThrow(/lowercase letters, numbers, hyphens/);
    });

    it('rejects an empty id', () => {
      expect(() => validateParams({ aiIndexId: '' })).toThrow();
    });
  });
});
