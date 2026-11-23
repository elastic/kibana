/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { Type } from '@kbn/config-schema';
import { MEMORY_RECALL_PATH } from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { RecallRequest } from '../../common/http_api/memory_recall';
import type { ContextEngineAnalyticsService } from '../telemetry';
import { registerMemoryRecallRoutes } from './memory_recall';

interface RegisteredRoute {
  config: {
    path: string;
    access: string;
    security: { authz: { requiredPrivileges: string[]; extendedPrivileges: string[] } };
  };
  handler: RequestHandler;
  validate: { request: { body: Type<RecallRequest> } };
}

describe('memory recall routes', () => {
  let route: RegisteredRoute;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let featureFlagEnabled: boolean;
  let list: jest.Mock;

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => featureFlagEnabled) },
        },
        elasticsearch: {
          client: { asCurrentUser: { inference: { rerank: jest.fn() }, search: jest.fn() } },
        },
        userProfile: { getCurrentProfileId: jest.fn().mockResolvedValue('jdoe') },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const callRoute = (body: Record<string, unknown>, canManageMemory = false) =>
    route.handler(
      createContext(),
      Object.assign(
        httpServerMock.createKibanaRequest({ body: route.validate.request.body.validate(body) }),
        { authzResult: { [apiPrivileges.manageMemory]: canManageMemory } }
      ),
      response
    );

  const recallFor = (userId: string) => ({
    query: 'why was checkout slow?',
    user_id: userId,
    include: ['ai_index:ops-memory'],
    format: 'json',
  });

  beforeEach(() => {
    featureFlagEnabled = true;
    response = httpServerMock.createResponseFactory();
    list = jest.fn().mockResolvedValue([]);

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

    registerMemoryRecallRoutes({
      router,
      getAiIndexDataReadService: () => ({ list, query: jest.fn(), describe: jest.fn() }),
      analyticsService: {
        reportMemoryRecall: jest.fn(),
      } as unknown as ContextEngineAnalyticsService,
    });
  });

  it('registers a public read route that checks manage_memory', () => {
    expect(route.config).toMatchObject({
      path: MEMORY_RECALL_PATH,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.readContextEngine],
          extendedPrivileges: [apiPrivileges.manageMemory],
        },
      },
    });
  });

  it('returns 404 when the context engine is disabled', async () => {
    featureFlagEnabled = false;

    await callRoute(recallFor('jdoe'));

    expect(response.notFound).toHaveBeenCalledTimes(1);
  });

  it('defaults token_budget and format', () => {
    expect(
      route.validate.request.body.validate({
        query: 'why was checkout slow?',
        user_id: 'jdoe',
        include: ['session_events', 'ai_index:ops-memory', 'ai_index:*'],
      })
    ).toEqual({
      query: 'why was checkout slow?',
      user_id: 'jdoe',
      include: ['session_events', 'ai_index:ops-memory', 'ai_index:*'],
      token_budget: 6000,
      format: 'yaml',
    });
  });

  it('requires user_id', () => {
    expect(() =>
      route.validate.request.body.validate({ query: 'q', include: ['session_events'] })
    ).toThrow();
  });

  it.each([[[]], [['ops-memory']], [['ai_index:Not Valid']]])('rejects include %j', (include) => {
    expect(() =>
      route.validate.request.body.validate({ query: 'q', user_id: 'jdoe', include })
    ).toThrow();
  });

  it('rejects token_budget outside its bounds', () => {
    expect(() =>
      route.validate.request.body.validate({
        query: 'q',
        user_id: 'jdoe',
        include: ['session_events'],
        token_budget: 500,
      })
    ).toThrow();
  });

  it('recalls for the caller', async () => {
    await callRoute(recallFor('jdoe'));

    expect(list).toHaveBeenCalledWith(['ops-memory']);
    expect(response.ok).toHaveBeenCalledWith({
      body: { results: [], took_ms: expect.any(Number) },
    });
  });

  it('returns 403 for another user without manage_memory', async () => {
    await callRoute(recallFor('asmith'));

    expect(response.forbidden).toHaveBeenCalledTimes(1);
    expect(list).not.toHaveBeenCalled();
  });

  it('recalls for another user with manage_memory', async () => {
    await callRoute(recallFor('asmith'), true);

    expect(response.ok).toHaveBeenCalledTimes(1);
  });
});
