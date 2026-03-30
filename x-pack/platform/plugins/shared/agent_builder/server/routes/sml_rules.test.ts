/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { registerSmlRuleRoutes } from './sml_rules';
import type { RouteDependencies } from './types';
import { publicApiPath } from '../../common/constants';
import { SmlRuleNotFoundError } from '../services/sml/sml_rule_service';

describe('SML Rule Routes', () => {
  const listPath = `${publicApiPath}/sml/{type}/rule`;
  const itemPath = `${publicApiPath}/sml/{type}/rule/{ruleId}`;

  let routeHandlers: Record<
    string,
    { handler: (ctx: unknown, req: unknown, res: unknown) => Promise<unknown> }
  >;
  let mockCreateOrUpdate: jest.Mock;
  let mockGet: jest.Mock;
  let mockList: jest.Mock;
  let mockDelete: jest.Mock;

  const createMockContext = () => ({
    core: Promise.resolve({
      uiSettings: { client: { get: jest.fn().mockResolvedValue(true) } },
      elasticsearch: {
        client: { asCurrentUser: {} },
      },
    }),
    licensing: Promise.resolve({
      license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
    }),
    agentBuilder: Promise.resolve({
      spaces: { getSpaceId: jest.fn().mockReturnValue('default') },
    }),
  });

  const mockResponse = {
    ok: jest.fn((params: { body?: unknown }) => ({ type: 'ok', ...params })),
    notFound: jest.fn((params?: unknown) => ({ type: 'notFound', ...params })),
    badRequest: jest.fn((params?: unknown) => ({ type: 'badRequest', ...params })),
    customError: jest.fn((params?: unknown) => ({ type: 'customError', ...params })),
    forbidden: jest.fn((params?: unknown) => ({ type: 'forbidden', ...params })),
  };

  const mockRule = {
    id: 'rule-1',
    name: 'Test Rule',
    type: 'index',
    index_pattern: 'logs-*',
    prompt: 'Summarize this index',
    inference_id: 'my-endpoint',
    space: 'default',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    routeHandlers = {};
    mockCreateOrUpdate = jest.fn().mockResolvedValue(mockRule);
    mockGet = jest.fn().mockResolvedValue(mockRule);
    mockList = jest.fn().mockResolvedValue([mockRule]);
    mockDelete = jest.fn().mockResolvedValue({ success: true });

    const getInternalServices = jest.fn().mockReturnValue({
      smlRules: {
        createOrUpdate: mockCreateOrUpdate,
        get: mockGet,
        list: mockList,
        delete: mockDelete,
      },
    });

    const createVersionedRoute = (method: string, path: string) => ({
      addVersion: jest
        .fn()
        .mockImplementation(
          (
            _config: unknown,
            handler: (ctx: unknown, req: unknown, res: unknown) => Promise<unknown>
          ) => {
            routeHandlers[`${method}:${path}`] = { handler };
            return { addVersion: jest.fn() };
          }
        ),
    });

    const mockRouter = {
      get: jest.fn(),
      versioned: {
        get: jest
          .fn()
          .mockImplementation((config: { path: string }) =>
            createVersionedRoute('GET', config.path)
          ),
        post: jest
          .fn()
          .mockImplementation((config: { path: string }) =>
            createVersionedRoute('POST', config.path)
          ),
        put: jest
          .fn()
          .mockImplementation((config: { path: string }) =>
            createVersionedRoute('PUT', config.path)
          ),
        delete: jest
          .fn()
          .mockImplementation((config: { path: string }) =>
            createVersionedRoute('DELETE', config.path)
          ),
      },
    } as unknown as jest.Mocked<IRouter>;

    registerSmlRuleRoutes({
      router: mockRouter,
      getInternalServices,
      logger: loggingSystemMock.createLogger(),
    } as unknown as RouteDependencies);
  });

  const getHandler = (method: string, path: string) => routeHandlers[`${method}:${path}`]?.handler;

  describe('GET /sml/{type}/rule (list)', () => {
    it('returns rules for the given type', async () => {
      const handler = getHandler('GET', listPath);
      const result = await handler!(
        createMockContext(),
        { params: { type: 'index' } },
        mockResponse
      );

      expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ type: 'index' }));
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          results: [expect.objectContaining({ id: 'rule-1', name: 'Test Rule' })],
        },
      });
      // space should be stripped from response
      const okCall = mockResponse.ok.mock.calls[0][0];
      const firstResult = (okCall.body as any).results[0];
      expect(firstResult).not.toHaveProperty('space');
    });
  });

  describe('GET /sml/{type}/rule/{ruleId} (get)', () => {
    it('returns a rule by id', async () => {
      const handler = getHandler('GET', itemPath);
      await handler!(
        createMockContext(),
        { params: { type: 'index', ruleId: 'rule-1' } },
        mockResponse
      );

      expect(mockGet).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'index', ruleId: 'rule-1' })
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({ id: 'rule-1' }),
      });
    });

    it('returns 404 when rule not found', async () => {
      mockGet.mockRejectedValueOnce(new SmlRuleNotFoundError('rule-1'));

      const handler = getHandler('GET', itemPath);
      await handler!(
        createMockContext(),
        { params: { type: 'index', ruleId: 'rule-1' } },
        mockResponse
      );

      expect(mockResponse.notFound).toHaveBeenCalledWith({
        body: { message: expect.stringContaining('rule-1') },
      });
    });
  });

  describe('PUT /sml/{type}/rule/{ruleId} (upsert)', () => {
    const body = {
      name: 'Test Rule',
      index_pattern: 'logs-*',
      prompt: 'Summarize this',
      inference_id: 'my-endpoint',
    };

    it('creates or updates a rule', async () => {
      const handler = getHandler('PUT', itemPath);
      await handler!(
        createMockContext(),
        { params: { type: 'index', ruleId: 'rule-1' }, body },
        mockResponse
      );

      expect(mockCreateOrUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'index',
          ruleId: 'rule-1',
          body,
        })
      );
      expect(mockResponse.ok).toHaveBeenCalled();
    });

    it('strips space from the response', async () => {
      const handler = getHandler('PUT', itemPath);
      await handler!(
        createMockContext(),
        { params: { type: 'index', ruleId: 'rule-1' }, body },
        mockResponse
      );

      const okCall = mockResponse.ok.mock.calls[0][0];
      expect(okCall.body as any).not.toHaveProperty('space');
    });
  });

  describe('DELETE /sml/{type}/rule/{ruleId}', () => {
    it('deletes a rule', async () => {
      const handler = getHandler('DELETE', itemPath);
      await handler!(
        createMockContext(),
        { params: { type: 'index', ruleId: 'rule-1' } },
        mockResponse
      );

      expect(mockDelete).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'index', ruleId: 'rule-1' })
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { success: true },
      });
    });

    it('returns 404 when rule not found', async () => {
      mockDelete.mockRejectedValueOnce(new SmlRuleNotFoundError('rule-1'));

      const handler = getHandler('DELETE', itemPath);
      await handler!(
        createMockContext(),
        { params: { type: 'index', ruleId: 'rule-1' } },
        mockResponse
      );

      expect(mockResponse.notFound).toHaveBeenCalledWith({
        body: { message: expect.stringContaining('rule-1') },
      });
    });
  });
});
