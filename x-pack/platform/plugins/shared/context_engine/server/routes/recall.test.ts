/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { Type } from '@kbn/config-schema';
import type { IRouter, RequestHandler } from '@kbn/core/server';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { registerRecallRoutes } from './recall';
import {
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
import type { RecallResponse } from '../../common/http_api/recall';
import type { RecallService } from '../recall/service';
import { MANAGE_MEMORY_REQUIRED_MESSAGE } from './memory_user';
import { MEMORY_DISABLED_MESSAGE } from './with_feature_flag';

interface RegisteredRoute {
  config: {
    path: string;
    access: string;
    security: { authz: { requiredPrivileges: string[]; extendedPrivileges: string[] } };
    options: { availability: unknown };
  };
  handler: RequestHandler;
  validate: { request: { body: Type<Record<string, unknown>> } };
}

const esResponseError = (statusCode: number) =>
  new errors.ResponseError(
    elasticsearchClientMock.createApiResponse({
      statusCode,
      body: { error: { type: 'es_rejected_execution_exception', reason: 'too many requests' } },
    })
  );

const yamlResponse = { context: 'results: []\n', took_ms: 12 };

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
  let auditLog: jest.Mock;
  let auditLogger: { log: jest.Mock };
  let getSpaces: jest.Mock<Promise<SpacesPluginStart | undefined>>;
  let getRecallService: jest.Mock<Promise<RecallService>>;
  let service: jest.Mocked<RecallService>;

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => featureFlagEnabled) },
        },
        security: { audit: { logger: auditLogger } },
        userProfile: { getCurrentProfileId: getProfileId },
        elasticsearch: { client: { asCurrentUser: esClient } },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const validateBody = (body: unknown) => route.validate.request.body.validate(body);

  const callRoute = (body: Record<string, unknown>) =>
    route.handler(
      createContext(),
      Object.assign(httpServerMock.createKibanaRequest({ body: validateBody(body) }), {
        authzResult,
      }),
      response
    );

  const recallContext = () => service.recall.mock.calls[0][0];
  const recallRequest = () => service.recall.mock.calls[0][1];
  const auditedEvents = () => auditLog.mock.calls.map(([event]) => event);
  const recallFailure = (targetUserId: string) =>
    expect.objectContaining({
      event: expect.objectContaining({ action: 'memory_recall', outcome: 'failure' }),
      user: { target: { id: targetUserId } },
    });

  const sessionBody = {
    query: 'Why is checkout slow?',
    user_id: 'u_jdoe_profile',
    include: ['session_events', 'session_memory'],
  };

  beforeEach(() => {
    featureFlagEnabled = true;
    memoryEnabled = true;
    isMemoryEnabled = jest.fn(async () => memoryEnabled);
    profileUid = 'u_jdoe_profile';
    getProfileId = jest.fn(async () => profileUid);
    authzResult = {};
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    auditLog = jest.fn();
    auditLogger = { log: auditLog };
    response = httpServerMock.createResponseFactory();
    service = { recall: jest.fn<Promise<RecallResponse>, Parameters<RecallService['recall']>>() };
    service.recall.mockResolvedValue(yamlResponse);
    getSpaces = jest.fn(
      async () =>
        ({ spacesService: { getSpaceId: () => 'marketing' } } as unknown as SpacesPluginStart)
    );
    getRecallService = jest.fn(async () => service);

    const router = {
      versioned: {
        post: jest.fn((config: RegisteredRoute['config']) => ({
          addVersion: (
            versionConfig: { validate: RegisteredRoute['validate'] },
            handler: RequestHandler
          ) => {
            route = { config, handler, validate: versionConfig.validate };
          },
        })),
      },
    } as unknown as IRouter;

    registerRecallRoutes({ router, getSpaces, getRecallService, isMemoryEnabled });
  });

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
      options: { availability: { stability: 'experimental' } },
    });
    expect(RECALL_PATH).toBe(route.config.path);
  });

  it('returns 404 and recalls nothing when the context engine is disabled', async () => {
    featureFlagEnabled = false;

    await callRoute(sessionBody);

    expect(response.notFound).toHaveBeenCalledTimes(1);
    expect(isMemoryEnabled).not.toHaveBeenCalled();
    expect(getRecallService).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  describe('memory turned off', () => {
    beforeEach(() => {
      memoryEnabled = false;
    });

    it.each([[['session_events']], [['session_memory']], [['session_events', 'ai_index:*']]])(
      'returns 404 without recalling or auditing for include %j',
      async (include) => {
        await callRoute({ ...sessionBody, include });

        expect(response.notFound).toHaveBeenCalledWith({
          body: { message: MEMORY_DISABLED_MESSAGE },
        });
        expect(service.recall).not.toHaveBeenCalled();
        expect(auditLog).not.toHaveBeenCalled();
      }
    );

    it.each([[['ai_index:*']], [['ai_index:ops']]])(
      'still recalls from AI indices only for include %j',
      async (include) => {
        await callRoute({ ...sessionBody, include });

        expect(response.notFound).not.toHaveBeenCalled();
        expect(recallRequest()).toMatchObject({ include });
        expect(response.ok).toHaveBeenCalledWith({ body: yamlResponse });
      }
    );
  });

  describe('user_id', () => {
    it("recalls the caller's own memory without manage memory", async () => {
      authzResult = { [apiPrivileges.manageMemory]: false };

      await callRoute(sessionBody);

      expect(recallRequest()).toMatchObject({ user_id: 'u_jdoe_profile' });
      expect(response.ok).toHaveBeenCalledTimes(1);
    });

    it('recalls another user with manage memory without looking up the profile', async () => {
      authzResult = { [apiPrivileges.manageMemory]: true };

      await callRoute({ ...sessionBody, user_id: 'u_other' });

      expect(getProfileId).not.toHaveBeenCalled();
      expect(recallRequest()).toMatchObject({ user_id: 'u_other' });
      expect(response.ok).toHaveBeenCalledTimes(1);
    });

    it('returns 403 and audits when naming another user without manage memory', async () => {
      authzResult = { [apiPrivileges.manageMemory]: false };

      await callRoute({ ...sessionBody, user_id: 'u_other' });

      expect(response.forbidden).toHaveBeenCalledWith({
        body: { message: MANAGE_MEMORY_REQUIRED_MESSAGE },
      });
      expect(service.recall).not.toHaveBeenCalled();
      expect(auditedEvents()).toEqual([recallFailure('u_other')]);
    });

    it('returns 403 without auditing for an AI-index-only request naming another user', async () => {
      await callRoute({ ...sessionBody, user_id: 'u_other', include: ['ai_index:*'] });

      expect(response.forbidden).toHaveBeenCalledWith({
        body: { message: MANAGE_MEMORY_REQUIRED_MESSAGE },
      });
      expect(service.recall).not.toHaveBeenCalled();
      expect(auditLog).not.toHaveBeenCalled();
    });

    it('returns 403 for a caller without a profile and without manage memory', async () => {
      profileUid = null;

      await callRoute(sessionBody);

      expect(response.forbidden).toHaveBeenCalledWith({
        body: { message: MANAGE_MEMORY_REQUIRED_MESSAGE },
      });
      expect(service.recall).not.toHaveBeenCalled();
    });

    it('recalls for the named user when the caller has no profile, with manage memory', async () => {
      profileUid = null;
      authzResult = { [apiPrivileges.manageMemory]: true };

      await callRoute(sessionBody);

      expect(recallRequest()).toMatchObject({ user_id: 'u_jdoe_profile' });
      expect(response.ok).toHaveBeenCalledTimes(1);
    });

    it('audits and rethrows when resolving the user profile fails', async () => {
      getProfileId.mockRejectedValueOnce(new Error('profile activation failed'));

      await expect(callRoute(sessionBody)).rejects.toThrow('profile activation failed');
      expect(service.recall).not.toHaveBeenCalled();
      expect(auditedEvents()).toEqual([recallFailure('u_jdoe_profile')]);
      expect(auditedEvents()[0].error).toEqual({
        code: 'Error',
        message: 'profile activation failed',
      });
    });
  });

  describe('service', () => {
    it('passes the space, caller client, audit logger and request to the service', async () => {
      await callRoute(sessionBody);

      expect(recallContext()).toEqual({
        space: 'marketing',
        callerEsClient: esClient,
        auditLogger,
      });
      expect(recallRequest()).toEqual(sessionBody);
      expect(response.ok).toHaveBeenCalledWith({ body: yamlResponse });
    });

    it('passes every optional field and returns the JSON response', async () => {
      const jsonResponse = {
        results: [
          {
            id: 'evt-1',
            session_id: 's1',
            source: 'session_events' as const,
            date: '2026-11-16T09:58:00.000Z',
            role: 'user' as const,
            content: 'Why is checkout slow?',
          },
        ],
        took_ms: 30,
      };
      service.recall.mockResolvedValueOnce(jsonResponse);
      const body = {
        ...sessionBody,
        include: ['session_events', 'ai_index:ops-memory'],
        session_ids: ['s1', 's2'],
        token_budget: 2000,
        format: 'json',
      };

      await callRoute(body);

      expect(recallRequest()).toEqual(body);
      expect(response.ok).toHaveBeenCalledWith({ body: jsonResponse });
    });

    it.each([
      ['getSpaces', () => getSpaces.mockRejectedValueOnce(new Error('spaces unavailable'))],
      [
        'getRecallService',
        () => getRecallService.mockRejectedValueOnce(new Error('service unavailable')),
      ],
    ])('audits and rethrows when %s fails', async (_name, fail) => {
      fail();

      await expect(callRoute(sessionBody)).rejects.toThrow('unavailable');
      expect(service.recall).not.toHaveBeenCalled();
      expect(auditedEvents()).toEqual([recallFailure('u_jdoe_profile')]);
    });

    it('rethrows without auditing when getRecallService fails for AI indices only', async () => {
      getRecallService.mockRejectedValueOnce(new Error('service unavailable'));

      await expect(callRoute({ ...sessionBody, include: ['ai_index:*'] })).rejects.toThrow(
        'service unavailable'
      );
      expect(auditLog).not.toHaveBeenCalled();
    });
  });

  describe('errors from the service', () => {
    it('returns 429 for an Elasticsearch 429 without auditing again', async () => {
      const tooManyRequests = esResponseError(429);
      service.recall.mockRejectedValueOnce(tooManyRequests);

      await callRoute(sessionBody);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 429,
        body: { message: 'es_rejected_execution_exception: too many requests' },
      });
      expect(auditLog).not.toHaveBeenCalled();
    });

    it.each([
      ['an Elasticsearch 400', esResponseError(400)],
      ['an Elasticsearch 503', esResponseError(503)],
      ['a generic error', new Error('cluster unavailable')],
    ])('rethrows %s without forwarding its status or auditing again', async (_name, error) => {
      service.recall.mockRejectedValueOnce(error);

      await expect(callRoute(sessionBody)).rejects.toThrow(error);
      expect(response.customError).not.toHaveBeenCalled();
      expect(auditLog).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    const valid = { query: 'q', user_id: 'u1', include: ['session_events'] };
    const tooLong = (length: number) => 'x'.repeat(length + 1);

    it('accepts a minimal request', () => {
      expect(() => validateBody(valid)).not.toThrow();
    });

    it.each([
      ['yaml', MIN_RECALL_TOKEN_BUDGET],
      ['json', MAX_RECALL_TOKEN_BUDGET],
    ])('accepts a full request with format %s and token_budget %d', (format, tokenBudget) => {
      expect(() =>
        validateBody({
          ...valid,
          include: ['session_events', 'session_memory', 'ai_index:*', 'ai_index:ops-memory'],
          session_ids: ['s1'],
          token_budget: tokenBudget,
          format,
        })
      ).not.toThrow();
    });

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
      ['an unknown format', { ...valid, format: 'xml' }],
      ['an unknown top-level field', { ...valid, limit: 10 }],
    ])('rejects %s', (_name, body) => {
      expect(() => validateBody(body)).toThrow();
    });
  });
});
