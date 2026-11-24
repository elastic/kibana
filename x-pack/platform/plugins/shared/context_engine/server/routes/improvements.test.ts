/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { aiIndexFeedbackAnalysisRunPath } from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { FeedbackAnalysisAlreadyRunningError } from '../feedback_analysis/schedule';
import type { FeedbackAnalysisScheduleService } from '../feedback_analysis/schedule';
import type { ProposalsProvider } from '../proposals/provider';
import { registerImprovementRoutes } from './improvements';

interface RegisteredRoute {
  config: {
    path: string;
    access: string;
    security: { authz: { requiredPrivileges: string[] } };
  };
  handler: RequestHandler;
}

const AI_INDEX_ID = 'support';

describe('feedback analysis routes', () => {
  let routes: Record<string, RegisteredRoute>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let featureFlagEnabled: boolean;
  let feedbackLoopEnabled: boolean;
  let proposalsProvider: ProposalsProvider | undefined;
  let aiIndexService: jest.Mocked<AiIndexService>;
  let scheduleService: jest.Mocked<FeedbackAnalysisScheduleService>;
  let auditLog: jest.Mock;

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => featureFlagEnabled) },
        },
        security: { audit: { logger: { log: auditLog } } },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const run = () =>
    routes[`POST:${aiIndexFeedbackAnalysisRunPath}`].handler(
      createContext(),
      httpServerMock.createKibanaRequest({ params: { aiIndexId: AI_INDEX_ID } }),
      response
    );

  beforeEach(() => {
    jest.clearAllMocks();
    routes = {};
    featureFlagEnabled = true;
    feedbackLoopEnabled = true;
    auditLog = jest.fn();
    response = httpServerMock.createResponseFactory();
    proposalsProvider = { create: jest.fn(), list: jest.fn() };

    aiIndexService = {
      get: jest.fn().mockResolvedValue({
        id: AI_INDEX_ID,
        feedback_analysis: { enabled: true },
      }),
    } as unknown as jest.Mocked<AiIndexService>;

    scheduleService = {
      reconcile: jest.fn(),
      run: jest.fn().mockResolvedValue('execution-1'),
      remove: jest.fn(),
    };

    const createVersionedRoute = (method: string) => (config: RegisteredRoute['config']) => ({
      addVersion: (_versionConfig: unknown, handler: RequestHandler) => {
        routes[`${method}:${config.path}`] = { config, handler };
      },
    });

    registerImprovementRoutes({
      router: {
        versioned: {
          get: jest.fn(createVersionedRoute('GET')),
          post: jest.fn(createVersionedRoute('POST')),
        },
      } as unknown as IRouter,
      getAiIndexService: () => aiIndexService,
      getProposalsProvider: () => proposalsProvider,
      getScheduleService: () => scheduleService,
      getSpaces: async () => undefined,
      getFeedbackLoopEnabled: async () => feedbackLoopEnabled,
    });
  });

  it('registers only the run route, as a write route', () => {
    expect(Object.keys(routes)).toEqual([`POST:${aiIndexFeedbackAnalysisRunPath}`]);
    expect(routes[`POST:${aiIndexFeedbackAnalysisRunPath}`].config).toMatchObject({
      access: 'internal',
      security: { authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] } },
    });
  });

  it.each([
    ['the context engine setting is off', () => (featureFlagEnabled = false)],
    ['the feedback loop setting is off', () => (feedbackLoopEnabled = false)],
    ['the proposals plugin is not available', () => (proposalsProvider = undefined)],
  ])('returns 404 when %s', async (_name, disable) => {
    disable();

    await run();

    expect(response.notFound).toHaveBeenCalledTimes(1);
    expect(scheduleService.run).not.toHaveBeenCalled();
  });

  describe('run now', () => {
    it('starts a run and returns its execution id', async () => {
      await run();

      expect(scheduleService.run).toHaveBeenCalledWith(
        expect.objectContaining({ aiIndexId: AI_INDEX_ID, spaceId: expect.any(String) })
      );
      expect(response.ok).toHaveBeenCalledWith({ body: { execution_id: 'execution-1' } });
    });

    it('returns 409 when a run is already in flight', async () => {
      scheduleService.run.mockRejectedValue(new FeedbackAnalysisAlreadyRunningError(AI_INDEX_ID));

      await run();

      expect(response.conflict).toHaveBeenCalled();
      expect(response.ok).not.toHaveBeenCalled();
    });

    it('explains that analysis has to be enabled first', async () => {
      aiIndexService.get.mockResolvedValue({
        id: AI_INDEX_ID,
        feedback_analysis: { enabled: false },
      } as never);

      await run();

      expect(scheduleService.run).not.toHaveBeenCalled();
      expect(response.badRequest).toHaveBeenCalledWith({
        body: { message: expect.stringContaining('Enable it first') },
      });
    });

    it('404s an unknown AI index', async () => {
      aiIndexService.get.mockRejectedValue(new AiIndexNotFoundError(AI_INDEX_ID));

      await run();

      expect(response.notFound).toHaveBeenCalled();
    });
  });
});
