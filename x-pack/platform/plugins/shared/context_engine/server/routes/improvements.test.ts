/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { aiIndexFeedbackAnalysisRunPath, aiIndexImprovementsPath } from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { Improvement } from '../../common/http_api/improvements';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { FeedbackAnalysisAlreadyRunningError } from '../feedback_analysis/schedule';
import type { FeedbackAnalysisScheduleService } from '../feedback_analysis/schedule';
import type { ImprovementsServiceApi } from '../improvements/service';
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
const IMPROVEMENT_ID = 'imp-1';

const improvement = (overrides: Partial<Improvement> = {}): Improvement => ({
  improvement_id: IMPROVEMENT_ID,
  revision_id: 'rev-1',
  latest: true,
  ai_index_id: AI_INDEX_ID,
  space: 'default',
  '@timestamp': '2026-08-20T09:00:00.000Z',
  status: 'suggested',
  suggested_at: '2026-08-20T09:00:00.000Z',
  action: 'add_ki',
  title: 'Clarify the refund window',
  rationale: 'Three unanswered questions mentioned refunds.',
  payload: { ki: { type: 'document', title: 'Refund window' } },
  provenance: {
    agent_run_id: 'run-1',
    signal_ids: ['sig-1'],
    signal_spaces: ['default'],
    signal_window: { from: 'now-30d', to: 'now' },
    signal_count: 3,
  },
  ...overrides,
});

describe('improvements routes', () => {
  let routes: Record<string, RegisteredRoute>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let featureFlagEnabled: boolean;
  let feedbackLoopEnabled: boolean;
  let improvements: jest.Mocked<ImprovementsServiceApi>;
  let aiIndexService: jest.Mocked<AiIndexService>;
  let scheduleService: jest.Mocked<FeedbackAnalysisScheduleService>;
  let proposalsProvider: jest.Mocked<ProposalsProvider> | undefined;
  let auditLog: jest.Mock;
  let currentUser: { username: string } | null;

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => featureFlagEnabled) },
        },
        elasticsearch: { client: { asCurrentUser: { search: jest.fn() } } },
        security: {
          audit: { logger: { log: auditLog } },
          authc: { getCurrentUser: () => currentUser },
        },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const callRoute = async (
    method: 'GET' | 'POST',
    path: string,
    request: Record<string, unknown> = {}
  ) => {
    const route = routes[`${method}:${path}`];
    expect(route).toBeDefined();
    return route.handler(createContext(), httpServerMock.createKibanaRequest(request), response);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    routes = {};
    featureFlagEnabled = true;
    feedbackLoopEnabled = true;
    currentUser = { username: 'reviewer' };
    auditLog = jest.fn();
    response = httpServerMock.createResponseFactory();
    proposalsProvider = { create: jest.fn(), getOutcome: jest.fn().mockResolvedValue(null) };

    improvements = {
      write: jest.fn(),
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      get: jest.fn().mockResolvedValue(improvement()),
      historySummaryFor: jest.fn(),
      transition: jest.fn().mockImplementation(async (_id, to) => improvement({ status: to })),
      deleteByAiIndex: jest.fn(),
    };

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

    const router = {
      versioned: {
        get: jest.fn(createVersionedRoute('GET')),
        post: jest.fn(createVersionedRoute('POST')),
      },
    } as unknown as IRouter;

    registerImprovementRoutes({
      router,
      getAiIndexService: () => aiIndexService,
      getImprovementsService: () => improvements,
      getProposalsProvider: () => proposalsProvider,
      getScheduleService: () => scheduleService,
      getSpaces: async () => undefined,
      getFeedbackLoopEnabled: async () => feedbackLoopEnabled,
      logger: loggingSystemMock.createLogger(),
    });
  });

  it('registers the list as a read route and the run as a write route', () => {
    expect(routes[`GET:${aiIndexImprovementsPath}`].config).toMatchObject({
      access: 'internal',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
    });
    expect(routes[`POST:${aiIndexFeedbackAnalysisRunPath}`].config).toMatchObject({
      access: 'internal',
      security: { authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] } },
    });
  });

  it.each([
    ['the context engine setting is off', () => (featureFlagEnabled = false)],
    ['the feedback loop setting is off', () => (feedbackLoopEnabled = false)],
    ['the proposals plugin is not available', () => (proposalsProvider = undefined)],
  ])('returns 404 on every route when %s', async (_name, disable) => {
    disable();

    await callRoute('GET', aiIndexImprovementsPath, {
      params: { aiIndexId: AI_INDEX_ID },
      query: { from: 0, size: 25 },
    });
    await callRoute('POST', aiIndexFeedbackAnalysisRunPath, {
      params: { aiIndexId: AI_INDEX_ID },
    });

    expect(response.notFound).toHaveBeenCalledTimes(2);
  });

  describe('list', () => {
    it('defaults to the statuses still awaiting a decision', async () => {
      await callRoute('GET', aiIndexImprovementsPath, {
        params: { aiIndexId: AI_INDEX_ID },
        query: { from: 0, size: 25 },
      });

      expect(improvements.list).toHaveBeenCalledWith({
        aiIndexId: AI_INDEX_ID,
        status: ['suggested', 'failed'],
        from: 0,
        size: 25,
      });
    });

    it('records a decision made on the proposal before listing it', async () => {
      const listed = improvement();
      improvements.list.mockResolvedValue({ items: [listed], total: 1 });
      proposalsProvider!.getOutcome.mockResolvedValue({ state: 'rejected', by: 'ana' });

      await callRoute('GET', aiIndexImprovementsPath, {
        params: { aiIndexId: AI_INDEX_ID },
        query: { from: 0, size: 25 },
      });

      expect(proposalsProvider!.getOutcome).toHaveBeenCalledWith(
        expect.objectContaining({ proposalId: `context-engine-${IMPROVEMENT_ID}` })
      );
      expect(improvements.transition).toHaveBeenCalledWith(IMPROVEMENT_ID, 'rejected', {
        by: 'ana',
      });
      expect(response.ok).toHaveBeenCalledWith({
        body: { items: [expect.objectContaining({ status: 'rejected' })], total: 1 },
      });
    });

    it('passes an explicit status filter through', async () => {
      await callRoute('GET', aiIndexImprovementsPath, {
        params: { aiIndexId: AI_INDEX_ID },
        query: { status: ['applied', 'rejected'], from: 0, size: 25 },
      });

      expect(improvements.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: ['applied', 'rejected'] })
      );
    });
  });

  describe('run now', () => {
    it('starts a run and returns its execution id', async () => {
      await callRoute('POST', aiIndexFeedbackAnalysisRunPath, {
        params: { aiIndexId: AI_INDEX_ID },
      });

      expect(scheduleService.run).toHaveBeenCalledWith(
        expect.objectContaining({ aiIndexId: AI_INDEX_ID, spaceId: expect.any(String) })
      );
      expect(response.ok).toHaveBeenCalledWith({ body: { execution_id: 'execution-1' } });
    });

    it('returns 409 when a run is already in flight', async () => {
      scheduleService.run.mockRejectedValue(new FeedbackAnalysisAlreadyRunningError(AI_INDEX_ID));

      await callRoute('POST', aiIndexFeedbackAnalysisRunPath, {
        params: { aiIndexId: AI_INDEX_ID },
      });

      expect(response.conflict).toHaveBeenCalled();
      expect(response.ok).not.toHaveBeenCalled();
    });

    it('explains that analysis has to be enabled first', async () => {
      aiIndexService.get.mockResolvedValue({
        id: AI_INDEX_ID,
        feedback_analysis: { enabled: false },
      } as never);

      await callRoute('POST', aiIndexFeedbackAnalysisRunPath, {
        params: { aiIndexId: AI_INDEX_ID },
      });

      expect(scheduleService.run).not.toHaveBeenCalled();
      expect(response.badRequest).toHaveBeenCalledWith({
        body: { message: expect.stringContaining('Enable it first') },
      });
    });

    it('404s an unknown AI index', async () => {
      aiIndexService.get.mockRejectedValue(new AiIndexNotFoundError(AI_INDEX_ID));

      await callRoute('POST', aiIndexFeedbackAnalysisRunPath, {
        params: { aiIndexId: AI_INDEX_ID },
      });

      expect(response.notFound).toHaveBeenCalled();
    });
  });
});
