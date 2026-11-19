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
    security: { authz: { requiredPrivileges: string[] } };
  };
  handler: RequestHandler;
  validate: { request: { body: Type<RecallRequest> } };
}

describe('memory recall routes', () => {
  let route: RegisteredRoute;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let featureFlagEnabled: boolean;
  let list: jest.Mock;
  let query: jest.Mock;
  let inference: jest.Mock;

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => featureFlagEnabled) },
        },
        elasticsearch: {
          client: { asCurrentUser: { inference: { rerank: inference } } },
        },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const callRoute = (body: Record<string, unknown>) =>
    route.handler(
      createContext(),
      httpServerMock.createKibanaRequest({ body: route.validate.request.body.validate(body) }),
      response
    );

  beforeEach(() => {
    featureFlagEnabled = true;
    response = httpServerMock.createResponseFactory();
    list = jest.fn().mockResolvedValue([]);
    query = jest.fn();
    inference = jest.fn();

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
      getAiIndexDataReadService: () => ({ list, query, describe: jest.fn() }),
      analyticsService: {
        reportMemoryRecall: jest.fn(),
      } as unknown as ContextEngineAnalyticsService,
    });
  });

  it('registers a public read route', () => {
    expect(route.config).toMatchObject({
      path: MEMORY_RECALL_PATH,
      access: 'public',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
    });
  });

  it('returns 404 when the context engine is disabled', async () => {
    featureFlagEnabled = false;

    await callRoute({ query: 'why was checkout slow?', include: { session_events: true } });

    expect(response.notFound).toHaveBeenCalledTimes(1);
  });

  it('defaults include flags, max_tokens and format', () => {
    expect(
      route.validate.request.body.validate({
        query: 'why was checkout slow?',
        include: { session_events: true },
      })
    ).toEqual({
      query: 'why was checkout slow?',
      include: { session_events: true, session_memory: false, ai_index_ids: [] },
      max_tokens: 6000,
      format: 'text',
    });
  });

  it('rejects a request that includes no store', () => {
    expect(() => route.validate.request.body.validate({ query: 'q', include: {} })).toThrow(
      'at least one store is required'
    );
  });

  it('rejects max_tokens outside its bounds', () => {
    expect(() =>
      route.validate.request.body.validate({
        query: 'q',
        include: { session_events: true },
        max_tokens: 500,
      })
    ).toThrow();
  });

  it('returns the recall response', async () => {
    await callRoute({
      query: 'why was checkout slow?',
      include: { ai_index_ids: ['ops-memory'] },
      format: 'json',
    });

    expect(list).toHaveBeenCalledWith(['ops-memory']);
    expect(response.ok).toHaveBeenCalledWith({
      body: { results: [], took_ms: expect.any(Number) },
    });
  });
});
