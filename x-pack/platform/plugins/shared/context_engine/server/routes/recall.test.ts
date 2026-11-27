/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { Type } from '@kbn/config-schema';
import type { IRouter, RequestHandler } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { registerRecallRoutes } from './recall';
import {
  AI_INDEX_API_VERSION,
  MAX_MEMORY_ID_LENGTH,
  MAX_MEMORY_USER_ID_LENGTH,
  MAX_RECALL_INCLUDE_ENTRY_LENGTH,
  MAX_RECALL_INCLUDE_ITEMS,
  MAX_RECALL_QUERY_LENGTH,
  MAX_RECALL_SESSION_IDS,
  MAX_RECALL_TOKEN_BUDGET,
  MIN_RECALL_TOKEN_BUDGET,
  RECALL_PATH,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { RecallJsonResponse } from '../../common/http_api/recall';
import type { AiIndexDataReadServiceApi } from '../ai_indices/data_read_service';
import { AiIndexThrottledError } from '../ai_indices/errors';
import type { RecallService } from '../recall/service';
import type { GetAiIndexDataReadServiceParams } from '../types';
import {
  MANAGE_MEMORY_REQUIRED_MESSAGE,
  MEMORY_DISABLED_MESSAGE,
} from '../session_memory_client/errors';

interface RegisteredRoute {
  config: {
    path: string;
    access: string;
    security: { authz: { requiredPrivileges: string[]; extendedPrivileges: string[] } };
    options: { tags: string[]; availability: unknown };
  };
  versionConfig: {
    version: string;
    validate: {
      request: { body: Type<Record<string, unknown>> };
      response: Record<number, { body?: () => Type<unknown> }>;
    };
    options?: { oasOperationObject?: unknown };
  };
  handler: RequestHandler;
}

const esResponseError = (statusCode: number) =>
  new errors.ResponseError(
    elasticsearchClientMock.createApiResponse({
      statusCode,
      body: { error: { type: 'es_rejected_execution_exception', reason: 'too many requests' } },
    })
  );

const emptyResponse: RecallJsonResponse = { results: [], took_ms: 12 };

describe('recall routes', () => {
  let route: RegisteredRoute;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let featureFlagEnabled: boolean;
  let memoryEnabled: boolean;
  let isMemoryEnabled: jest.Mock<Promise<boolean>>;
  let profileUid: string | null;
  let getProfileId: jest.Mock<Promise<string | null>>;
  let authzResult: Record<string, boolean>;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let readService: jest.Mocked<AiIndexDataReadServiceApi>;
  let getAiIndexDataReadService: jest.Mock<
    AiIndexDataReadServiceApi,
    [GetAiIndexDataReadServiceParams]
  >;
  let getRecallService: jest.Mock<Promise<RecallService>>;
  let service: jest.Mocked<RecallService>;

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => featureFlagEnabled) },
        },
        userProfile: { getCurrentProfileId: getProfileId },
        elasticsearch: { client: { asCurrentUser: esClient } },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const validateBody = (body: unknown) => route.versionConfig.validate.request.body.validate(body);

  const callRoute = async (body: Record<string, unknown>) => {
    const request = Object.assign(
      httpServerMock.createKibanaRequest({ body: validateBody(body) }),
      { authzResult }
    );
    await route.handler(createContext(), request, response);
    return request;
  };

  const recallContext = () => service.recall.mock.calls[0][0];
  const recallRequest = () => service.recall.mock.calls[0][1];

  const aiIndexBody = {
    query: 'Why is checkout slow?',
    user_id: 'u_jdoe_profile',
    include: ['ai_index:*'],
  };
  const sessionBody = { ...aiIndexBody, include: ['session_events', 'session_memory'] };

  beforeEach(() => {
    featureFlagEnabled = true;
    memoryEnabled = true;
    isMemoryEnabled = jest.fn(async () => memoryEnabled);
    profileUid = 'u_jdoe_profile';
    getProfileId = jest.fn(async () => profileUid);
    authzResult = {};
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
    response = httpServerMock.createResponseFactory();
    readService = { query: jest.fn(), describe: jest.fn(), list: jest.fn(), search: jest.fn() };
    getAiIndexDataReadService = jest.fn((_params: GetAiIndexDataReadServiceParams) => readService);
    service = { recall: jest.fn() };
    service.recall.mockResolvedValue(emptyResponse);
    getRecallService = jest.fn(async () => service);

    const router = {
      versioned: {
        post: jest.fn((config: RegisteredRoute['config']) => ({
          addVersion: (
            versionConfig: RegisteredRoute['versionConfig'],
            handler: RequestHandler
          ) => {
            route = { config, versionConfig, handler };
          },
        })),
      },
    } as unknown as IRouter;

    registerRecallRoutes({
      router,
      logger,
      getRecallService,
      getAiIndexDataReadService,
      isMemoryEnabled,
    });
  });

  describe('registration', () => {
    it('registers a public experimental route that needs read and checks manage memory', () => {
      expect(route.config).toMatchObject({
        path: '/api/context_engine/_recall',
        access: 'public',
        security: {
          authz: {
            requiredPrivileges: [apiPrivileges.readContextEngine],
            extendedPrivileges: [apiPrivileges.manageMemory],
          },
        },
        options: {
          tags: ['oas-tag:context engine'],
          availability: { stability: 'experimental', since: '9.7.0' },
        },
      });
      expect(route.config.path).toBe(RECALL_PATH);
      expect(route.versionConfig.version).toBe(AI_INDEX_API_VERSION);
    });

    it('declares JSON, 403, 404 and 429 responses without an OAS operation object', () => {
      expect(Object.keys(route.versionConfig.validate.response)).toEqual([
        '200',
        '403',
        '404',
        '429',
      ]);
      expect(route.versionConfig.options?.oasOperationObject).toBeUndefined();
    });

    it('validates AI index results in the 200 response', () => {
      const responseSchema = route.versionConfig.validate.response[200].body?.();
      const body = {
        results: [
          {
            id: 'ki-1',
            source: 'ai_index:ops',
            date: '2026-11-16T09:58:00.000Z',
            content: 'Checkout depends on the payments service',
            attributes: { tags: ['checkout'], score: 2 },
          },
          {
            id: 'ki-2',
            source: 'ai_index:docs',
            content: 'Minimal KI without date or attributes',
          },
        ],
        took_ms: 5,
      };

      expect(responseSchema?.validate(body)).toEqual(body);
      expect(() =>
        responseSchema?.validate({
          results: [{ id: 'ki-1', source: 'ops', content: 'c' }],
          took_ms: 1,
        })
      ).toThrow();
    });
  });

  it('returns 404 and recalls nothing when the context engine is disabled', async () => {
    featureFlagEnabled = false;

    await callRoute(sessionBody);

    expect(response.notFound).toHaveBeenCalledTimes(1);
    expect(isMemoryEnabled).not.toHaveBeenCalled();
    expect(getRecallService).not.toHaveBeenCalled();
  });

  describe('memory turned off', () => {
    beforeEach(() => {
      memoryEnabled = false;
    });

    it.each([[['session_events']], [['session_memory']], [['session_events', 'ai_index:*']]])(
      'returns 404 without recalling for include %j',
      async (include) => {
        await callRoute({ ...aiIndexBody, include });

        expect(response.notFound).toHaveBeenCalledWith({
          body: { message: MEMORY_DISABLED_MESSAGE },
        });
        expect(service.recall).not.toHaveBeenCalled();
      }
    );

    it.each([[['ai_index:*']], [['ai_index:ops']]])(
      'still recalls from AI indices only for include %j',
      async (include) => {
        await callRoute({ ...aiIndexBody, include });

        expect(isMemoryEnabled).not.toHaveBeenCalled();
        expect(response.notFound).not.toHaveBeenCalled();
        expect(recallRequest()).toMatchObject({ include });
        expect(response.ok).toHaveBeenCalledWith({ body: emptyResponse });
      }
    );
  });

  describe('user_id', () => {
    it("recalls for the caller's own user without manage memory", async () => {
      authzResult = { [apiPrivileges.manageMemory]: false };

      await callRoute(aiIndexBody);

      expect(recallRequest()).toMatchObject({ user_id: 'u_jdoe_profile' });
      expect(response.ok).toHaveBeenCalledTimes(1);
    });

    it('recalls for another user with manage memory without looking up the profile', async () => {
      authzResult = { [apiPrivileges.manageMemory]: true };

      await callRoute({ ...aiIndexBody, user_id: 'u_other' });

      expect(getProfileId).not.toHaveBeenCalled();
      expect(recallRequest()).toMatchObject({ user_id: 'u_other' });
      expect(response.ok).toHaveBeenCalledTimes(1);
    });

    it('returns 403 when naming another user without manage memory', async () => {
      authzResult = { [apiPrivileges.manageMemory]: false };

      await callRoute({ ...aiIndexBody, user_id: 'u_other' });

      expect(response.forbidden).toHaveBeenCalledWith({
        body: { message: MANAGE_MEMORY_REQUIRED_MESSAGE },
      });
      expect(getAiIndexDataReadService).not.toHaveBeenCalled();
      expect(service.recall).not.toHaveBeenCalled();
    });

    it('returns 403 for a caller without a profile and without manage memory', async () => {
      profileUid = null;

      await callRoute(aiIndexBody);

      expect(response.forbidden).toHaveBeenCalledWith({
        body: { message: MANAGE_MEMORY_REQUIRED_MESSAGE },
      });
      expect(service.recall).not.toHaveBeenCalled();
    });

    it('recalls for the named user when the caller has no profile, with manage memory', async () => {
      profileUid = null;
      authzResult = { [apiPrivileges.manageMemory]: true };

      await callRoute(aiIndexBody);

      expect(recallRequest()).toMatchObject({ user_id: 'u_jdoe_profile' });
      expect(response.ok).toHaveBeenCalledTimes(1);
    });

    it('returns 429 when resolving the user profile hits an Elasticsearch 429', async () => {
      getProfileId.mockRejectedValueOnce(esResponseError(429));

      await callRoute(aiIndexBody);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 429,
        body: { message: 'es_rejected_execution_exception: too many requests' },
      });
      expect(logger.error).not.toHaveBeenCalled();
      expect(service.recall).not.toHaveBeenCalled();
    });

    it('logs and rethrows when resolving the user profile fails', async () => {
      const error = new Error('profile activation failed');
      getProfileId.mockRejectedValueOnce(error);

      await expect(callRoute(aiIndexBody)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(error.stack);
      expect(service.recall).not.toHaveBeenCalled();
    });
  });

  describe('service', () => {
    it('scopes the AI index read service to the caller and passes the request through', async () => {
      const request = await callRoute(aiIndexBody);

      expect(getAiIndexDataReadService).toHaveBeenCalledWith({ esClient, request });
      expect(recallContext()).toEqual({ aiIndexDataReadService: readService });
      expect(recallRequest()).toEqual(aiIndexBody);
      expect(response.ok).toHaveBeenCalledWith({ body: emptyResponse });
    });

    it('passes every optional field and returns the JSON response with optional fields', async () => {
      const jsonResponse: RecallJsonResponse = {
        results: [
          {
            id: 'ki-1',
            source: 'ai_index:ops-memory',
            date: '2026-11-16T09:58:00.000Z',
            content: 'Checkout depends on payments',
            attributes: { service: 'checkout' },
          },
          { id: 'ki-2', source: 'ai_index:ops-memory', content: 'No date or attributes' },
        ],
        took_ms: 30,
      };
      service.recall.mockResolvedValueOnce(jsonResponse);
      const body = {
        ...aiIndexBody,
        include: ['session_events', 'ai_index:ops-memory'],
        session_ids: ['s1', 's2'],
        token_budget: 2000,
        format: 'json',
      };

      await callRoute(body);

      expect(recallRequest()).toEqual(body);
      expect(response.ok).toHaveBeenCalledWith({ body: jsonResponse });
    });

    it('rethrows when getRecallService fails', async () => {
      getRecallService.mockRejectedValueOnce(new Error('service unavailable'));

      await expect(callRoute(aiIndexBody)).rejects.toThrow('service unavailable');
      expect(service.recall).not.toHaveBeenCalled();
    });
  });

  describe('errors from the service', () => {
    it('returns 429 for an Elasticsearch 429 without logging an error', async () => {
      service.recall.mockRejectedValueOnce(esResponseError(429));

      await callRoute(aiIndexBody);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 429,
        body: { message: 'es_rejected_execution_exception: too many requests' },
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('returns 429 for a throttled readability probe without logging an error', async () => {
      service.recall.mockRejectedValueOnce(new AiIndexThrottledError('too many requests'));

      await callRoute(aiIndexBody);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 429,
        body: { message: 'too many requests' },
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it.each([
      ['an Elasticsearch 400', esResponseError(400)],
      ['an Elasticsearch 503', esResponseError(503)],
      ['a generic error', new Error('cluster unavailable')],
    ])('logs and rethrows %s without forwarding its status', async (_name, error) => {
      service.recall.mockRejectedValueOnce(error);

      await expect(callRoute(aiIndexBody)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(error.stack);
      expect(response.customError).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    const valid = { query: 'q', user_id: 'u1', include: ['session_events'] };
    const tooLong = (length: number) => 'x'.repeat(length + 1);

    it('accepts a minimal request', () => {
      expect(() => validateBody(valid)).not.toThrow();
    });

    it.each([MIN_RECALL_TOKEN_BUDGET, MAX_RECALL_TOKEN_BUDGET])(
      'accepts a full request with token_budget %d',
      (tokenBudget) => {
        expect(() =>
          validateBody({
            ...valid,
            include: ['session_events', 'session_memory', 'ai_index:*', 'ai_index:ops-memory'],
            session_ids: ['s1'],
            token_budget: tokenBudget,
            format: 'json',
          })
        ).not.toThrow();
      }
    );

    it.each([
      ['a missing query', { user_id: 'u1', include: ['session_events'] }],
      ['a blank query', { ...valid, query: '   ' }],
      ['an over-long query', { ...valid, query: tooLong(MAX_RECALL_QUERY_LENGTH) }],
      ['a missing user_id', { query: 'q', include: ['session_events'] }],
      ['a blank user_id', { ...valid, user_id: ' ' }],
      ['an over-long user_id', { ...valid, user_id: tooLong(MAX_MEMORY_USER_ID_LENGTH) }],
      ['a missing include', { query: 'q', user_id: 'u1' }],
      ['an empty include', { ...valid, include: [] }],
      ['an unknown include store', { ...valid, include: ['sessions'] }],
      ['an include with an empty AI index id', { ...valid, include: ['ai_index:'] }],
      ['an include with an invalid AI index id', { ...valid, include: ['ai_index:UPPER'] }],
      [
        'an over-long include entry',
        { ...valid, include: [`ai_index:${tooLong(MAX_RECALL_INCLUDE_ENTRY_LENGTH)}`] },
      ],
      [
        'too many include entries',
        { ...valid, include: Array(MAX_RECALL_INCLUDE_ITEMS + 1).fill('session_events') },
      ],
      ['a blank session_ids entry', { ...valid, session_ids: [' '] }],
      [
        'an over-long session_ids entry',
        { ...valid, session_ids: [tooLong(MAX_MEMORY_ID_LENGTH)] },
      ],
      [
        'too many session_ids',
        { ...valid, session_ids: Array(MAX_RECALL_SESSION_IDS + 1).fill('s1') },
      ],
      ['a token_budget below the minimum', { ...valid, token_budget: MIN_RECALL_TOKEN_BUDGET - 1 }],
      ['a token_budget above the maximum', { ...valid, token_budget: MAX_RECALL_TOKEN_BUDGET + 1 }],
      ['a fractional token_budget', { ...valid, token_budget: 1500.5 }],
      ['the yaml format, which is not supported yet', { ...valid, format: 'yaml' }],
      ['an unknown format', { ...valid, format: 'xml' }],
      ['an unknown top-level field', { ...valid, limit: 10 }],
    ])('rejects %s', (_name, body) => {
      expect(() => validateBody(body)).toThrow();
    });
  });
});
