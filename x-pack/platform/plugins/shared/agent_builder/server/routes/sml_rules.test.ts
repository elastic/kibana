/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { registerSmlRulesRoutes } from './sml_rules';
import type { RouteDependencies } from './types';
import { publicApiPath } from '../../common/constants';
import type { SmlRule, SmlRuleCreateBody } from '../../common/http_api/sml_rules';

const sampleRuleBody: SmlRuleCreateBody = {
  name: 'Test Rule',
  type: 'index',
  index_pattern: 'search-confluence-*',
  inference_id: 'my-llm-endpoint',
  prompt: 'Summarize ${variables.mappings}',
  variables: {
    Mappings: { type: 'index', input: '_mapping' },
  },
};

const sampleRule: SmlRule = {
  ...sampleRuleBody,
  id: 'rule-1',
  created_at: '2026-04-01T00:00:00.000Z',
  updated_at: '2026-04-01T00:00:00.000Z',
};

describe('SML Rules Routes', () => {
  let routeHandlers: Record<
    string,
    { handler: (ctx: unknown, req: unknown, res: unknown) => Promise<unknown> }
  >;
  let mockCreateOrUpdate: jest.Mock;
  let mockGet: jest.Mock;
  let mockList: jest.Mock;
  let mockDelete: jest.Mock;
  let mockUiSettingsGet: jest.Mock;
  let mockGetStartServices: jest.Mock;

  const mockEsClient = { mock: true };

  const createMockContext = () => ({
    core: Promise.resolve({
      uiSettings: {
        client: {
          get: mockUiSettingsGet.mockResolvedValue(false),
        },
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
    notFound: jest.fn(() => ({ type: 'notFound' })),
    customError: jest.fn((params: Record<string, unknown>) => ({ type: 'customError', ...params })),
    forbidden: jest.fn((params: Record<string, unknown>) => ({ type: 'forbidden', ...params })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    routeHandlers = {};
    mockCreateOrUpdate = jest.fn().mockResolvedValue(sampleRule);
    mockGet = jest.fn().mockResolvedValue(sampleRule);
    mockList = jest.fn().mockResolvedValue([sampleRule]);
    mockDelete = jest.fn().mockResolvedValue(true);
    mockUiSettingsGet = jest.fn();

    mockGetStartServices = jest.fn().mockResolvedValue([
      {
        elasticsearch: {
          client: {
            asScoped: jest.fn().mockReturnValue({
              asInternalUser: mockEsClient,
            }),
          },
        },
      },
    ]);

    const getInternalServices = jest.fn().mockReturnValue({
      smlRules: {
        createOrUpdate: mockCreateOrUpdate,
        get: mockGet,
        list: mockList,
        delete: mockDelete,
      },
    });

    const createVersionedRoute = (method: string, routePath: string) => ({
      addVersion: jest
        .fn()
        .mockImplementation(
          (
            _config: unknown,
            handler: (ctx: unknown, req: unknown, res: unknown) => Promise<unknown>
          ) => {
            routeHandlers[`${method}:${routePath}`] = { handler };
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

    registerSmlRulesRoutes({
      router: mockRouter,
      getInternalServices,
      logger: loggingSystemMock.createLogger(),
      coreSetup: {
        getStartServices: mockGetStartServices,
      },
    } as unknown as RouteDependencies);
  });

  const getHandler = (method: string, routePath: string) =>
    routeHandlers[`${method}:${routePath}`]?.handler;

  describe('POST /sml/rule/{ruleId} (create or update)', () => {
    const path = `${publicApiPath}/sml/rule/{ruleId}`;

    it('registers the route', () => {
      expect(getHandler('POST', path)).toBeDefined();
    });

    it('calls smlRules.createOrUpdate with correct arguments', async () => {
      const handler = getHandler('POST', path)!;
      const ctx = createMockContext();
      const request = {
        params: { ruleId: 'rule-1' },
        body: sampleRuleBody,
      };

      const result = await handler(ctx, request, mockResponse);

      expect(mockCreateOrUpdate).toHaveBeenCalledWith('rule-1', sampleRuleBody, mockEsClient);
      expect(result).toMatchObject({ type: 'ok', body: sampleRule });
    });
  });

  describe('GET /sml/rule (list)', () => {
    const path = `${publicApiPath}/sml/rule`;

    it('registers the route', () => {
      expect(getHandler('GET', path)).toBeDefined();
    });

    it('calls smlRules.list and returns results', async () => {
      const handler = getHandler('GET', path)!;
      const ctx = createMockContext();

      const result = await handler(ctx, {}, mockResponse);

      expect(mockList).toHaveBeenCalledWith(mockEsClient);
      expect(result).toMatchObject({ type: 'ok', body: { results: [sampleRule] } });
    });
  });

  describe('GET /sml/rule/{ruleId} (get by ID)', () => {
    const path = `${publicApiPath}/sml/rule/{ruleId}`;

    it('registers the route', () => {
      expect(getHandler('GET', path)).toBeDefined();
    });

    it('calls smlRules.get with correct ruleId', async () => {
      const handler = getHandler('GET', path)!;
      const ctx = createMockContext();
      const request = { params: { ruleId: 'rule-1' } };

      const result = await handler(ctx, request, mockResponse);

      expect(mockGet).toHaveBeenCalledWith('rule-1', mockEsClient);
      expect(result).toMatchObject({ type: 'ok', body: sampleRule });
    });
  });

  describe('DELETE /sml/rule/{ruleId}', () => {
    const path = `${publicApiPath}/sml/rule/{ruleId}`;

    it('registers the route', () => {
      expect(getHandler('DELETE', path)).toBeDefined();
    });

    it('calls smlRules.delete with correct ruleId', async () => {
      const handler = getHandler('DELETE', path)!;
      const ctx = createMockContext();
      const request = { params: { ruleId: 'rule-1' } };

      const result = await handler(ctx, request, mockResponse);

      expect(mockDelete).toHaveBeenCalledWith('rule-1', mockEsClient);
      expect(result).toMatchObject({ type: 'ok', body: { success: true } });
    });
  });
});
