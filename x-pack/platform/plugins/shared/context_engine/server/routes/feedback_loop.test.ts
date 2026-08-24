/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import {
  aiIndexFeedbackContextPath,
  aiIndexFeedbackRunPath,
  aiIndexFeedbackSchedulePath,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { FeedbackContext } from '../../common/http_api/feedback_loop';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { assembleFeedbackContext } from '../feedback/context';
import type { FeedbackScheduleService } from '../feedback/schedule';
import { FeedbackScheduleUnavailableError } from '../feedback/schedule';
import type { ImprovementsServiceApi } from '../improvements/service';
import { registerFeedbackLoopRoutes } from './feedback_loop';

jest.mock('../feedback/context');

const assembleFeedbackContextMock = assembleFeedbackContext as jest.MockedFunction<
  typeof assembleFeedbackContext
>;

const feedbackContext = {
  ai_index: { id: 'customer_support' },
  ki_summary: { count: 12, counts_by_type: [] },
  signal_groups: [],
  improvements: [],
  signals_index: 'context-engine-signals-default',
  agent_id: 'platform.context_engine.feedback_loop',
  prompt: 'Analyze the signals for customer_support.',
} as unknown as FeedbackContext;

describe('feedback loop routes', () => {
  let routes: Record<string, { config: Record<string, unknown>; handler: RequestHandler }>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let aiIndexService: jest.Mocked<Pick<AiIndexService, 'get'>>;
  let feedbackScheduleService: jest.Mocked<
    Pick<FeedbackScheduleService, 'getStatus' | 'setEnabled' | 'run'>
  >;
  let improvementsService: ImprovementsServiceApi;
  let contextEngineEnabled: boolean;
  let feedbackLoopEnabled: boolean;

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => contextEngineEnabled) },
        },
        elasticsearch: { client: { asCurrentUser: { id: 'as-current-user' } } },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const callRoute = async (method: string, path: string, request: Record<string, unknown> = {}) => {
    const route = routes[`${method}:${path}`];
    expect(route).toBeDefined();
    return route.handler(createContext(), httpServerMock.createKibanaRequest(request), response);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    routes = {};
    contextEngineEnabled = true;
    feedbackLoopEnabled = true;
    response = httpServerMock.createResponseFactory();
    aiIndexService = { get: jest.fn() };
    feedbackScheduleService = {
      getStatus: jest.fn().mockResolvedValue({ enabled: false }),
      setEnabled: jest.fn().mockResolvedValue({ enabled: true, workflow_id: 'wf-1' }),
      run: jest.fn().mockResolvedValue('exec-1'),
    };
    improvementsService = { history: jest.fn() } as unknown as ImprovementsServiceApi;
    assembleFeedbackContextMock.mockResolvedValue(feedbackContext);

    const createVersionedRoute =
      (method: string) => (config: { path: string } & Record<string, unknown>) => ({
        addVersion: (_versionConfig: unknown, handler: RequestHandler) => {
          routes[`${method}:${config.path}`] = { config, handler };
        },
      });

    const router = {
      versioned: {
        get: jest.fn(createVersionedRoute('GET')),
        post: jest.fn(createVersionedRoute('POST')),
        put: jest.fn(createVersionedRoute('PUT')),
      },
    } as unknown as IRouter;

    registerFeedbackLoopRoutes({
      router,
      getAiIndexService: () => aiIndexService as unknown as AiIndexService,
      getImprovementsService: () => improvementsService,
      getFeedbackScheduleService: () =>
        feedbackScheduleService as unknown as FeedbackScheduleService,
      getSpaces: async () => undefined,
      getFeedbackLoopEnabled: async () => feedbackLoopEnabled,
    });
  });

  it('registers the context route as internal and read-only', () => {
    expect(routes[`GET:${aiIndexFeedbackContextPath}`].config).toMatchObject({
      access: 'internal',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
    });
  });

  it('returns the assembled context for the active space', async () => {
    await callRoute('GET', aiIndexFeedbackContextPath, {
      params: { aiIndexId: 'customer_support' },
    });

    expect(assembleFeedbackContextMock).toHaveBeenCalledWith({
      esClient: { id: 'as-current-user' },
      aiIndexService,
      improvementsService,
      aiIndexId: 'customer_support',
      spaceId: 'default',
    });
    expect(response.ok).toHaveBeenCalledWith({ body: feedbackContext });
  });

  it('404s an unknown AI index', async () => {
    assembleFeedbackContextMock.mockRejectedValue(new AiIndexNotFoundError('missing'));

    await callRoute('GET', aiIndexFeedbackContextPath, { params: { aiIndexId: 'missing' } });

    expect(response.notFound).toHaveBeenCalled();
  });

  it('404s while the context engine setting is off', async () => {
    contextEngineEnabled = false;

    await callRoute('GET', aiIndexFeedbackContextPath, { params: { aiIndexId: 'a' } });

    expect(response.notFound).toHaveBeenCalled();
    expect(assembleFeedbackContextMock).not.toHaveBeenCalled();
  });

  it('404s while the feedback loop setting is off', async () => {
    feedbackLoopEnabled = false;

    await callRoute('GET', aiIndexFeedbackContextPath, { params: { aiIndexId: 'a' } });

    expect(response.notFound).toHaveBeenCalled();
    expect(assembleFeedbackContextMock).not.toHaveBeenCalled();
  });

  describe('run now', () => {
    it('starts a run and returns its execution id', async () => {
      await callRoute('POST', aiIndexFeedbackRunPath, {
        params: { aiIndexId: 'customer_support' },
      });

      expect(feedbackScheduleService.run).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'default', aiIndexId: 'customer_support' })
      );
      expect(response.ok).toHaveBeenCalledWith({ body: { execution_id: 'exec-1' } });
    });

    it('requires write privileges', () => {
      expect(routes[`POST:${aiIndexFeedbackRunPath}`].config).toMatchObject({
        access: 'internal',
        security: { authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] } },
      });
    });

    it('404s an unknown AI index without starting a run', async () => {
      aiIndexService.get.mockRejectedValue(new AiIndexNotFoundError('missing'));

      await callRoute('POST', aiIndexFeedbackRunPath, { params: { aiIndexId: 'missing' } });

      expect(response.notFound).toHaveBeenCalled();
      expect(feedbackScheduleService.run).not.toHaveBeenCalled();
    });

    it('503s when the workflows plumbing is missing', async () => {
      feedbackScheduleService.run.mockRejectedValue(
        new FeedbackScheduleUnavailableError('Workflows is not available')
      );

      await callRoute('POST', aiIndexFeedbackRunPath, {
        params: { aiIndexId: 'customer_support' },
      });

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: { message: 'Workflows is not available' },
      });
    });
  });

  describe('schedule', () => {
    it('reports the current schedule', async () => {
      feedbackScheduleService.getStatus.mockResolvedValue({ enabled: true, workflow_id: 'wf-1' });

      await callRoute('GET', aiIndexFeedbackSchedulePath, {
        params: { aiIndexId: 'customer_support' },
      });

      expect(feedbackScheduleService.getStatus).toHaveBeenCalledWith({
        spaceId: 'default',
        aiIndexId: 'customer_support',
      });
      expect(response.ok).toHaveBeenCalledWith({
        body: { enabled: true, workflow_id: 'wf-1' },
      });
    });

    it('enables the schedule on the caller’s request', async () => {
      await callRoute('PUT', aiIndexFeedbackSchedulePath, {
        params: { aiIndexId: 'customer_support' },
        body: { enabled: true },
      });

      expect(feedbackScheduleService.setEnabled).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: 'default',
          aiIndexId: 'customer_support',
          enabled: true,
        })
      );
      expect(response.ok).toHaveBeenCalledWith({ body: { enabled: true, workflow_id: 'wf-1' } });
    });

    it('404s an unknown AI index without touching the schedule', async () => {
      aiIndexService.get.mockRejectedValue(new AiIndexNotFoundError('missing'));

      await callRoute('PUT', aiIndexFeedbackSchedulePath, {
        params: { aiIndexId: 'missing' },
        body: { enabled: true },
      });

      expect(response.notFound).toHaveBeenCalled();
      expect(feedbackScheduleService.setEnabled).not.toHaveBeenCalled();
    });
  });
});
