/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  aiIndexFeedbackAnalysisRunPath,
  aiIndexImprovementsPath,
  improvementApprovePath,
  improvementRejectPath,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { Improvement } from '../../common/http_api/improvements';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import type { FeedbackAnalysisScheduleService } from '../feedback_analysis/schedule';
import { applyImprovement, ApplyImprovementError } from '../improvements/apply';
import { ImprovementConflictError } from '../improvements/errors';
import type { ImprovementsServiceApi } from '../improvements/service';
import type { WorkflowProvider } from '../workflows/provider';
import { ImprovementAuditAction } from './audit_events';
import { registerImprovementRoutes } from './improvements';

jest.mock('../improvements/apply', () => {
  const actual = jest.requireActual('../improvements/apply');
  return { ...actual, applyImprovement: jest.fn() };
});

const applyImprovementMock = applyImprovement as jest.MockedFunction<typeof applyImprovement>;

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
  let workflowProvider: WorkflowProvider | undefined;
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

  const approve = () =>
    callRoute('POST', improvementApprovePath, {
      params: { aiIndexId: AI_INDEX_ID, improvementId: IMPROVEMENT_ID },
    });

  const reject = (body: Record<string, unknown> = {}) =>
    callRoute('POST', improvementRejectPath, {
      params: { aiIndexId: AI_INDEX_ID, improvementId: IMPROVEMENT_ID },
      body,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    routes = {};
    featureFlagEnabled = true;
    feedbackLoopEnabled = true;
    currentUser = { username: 'reviewer' };
    auditLog = jest.fn();
    response = httpServerMock.createResponseFactory();
    workflowProvider = undefined;

    improvements = {
      write: jest.fn(),
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      get: jest.fn().mockResolvedValue(improvement()),
      historyFor: jest.fn(),
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

    applyImprovementMock.mockResolvedValue('ki-new');

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
      getWorkflowProvider: () => workflowProvider,
      getScheduleService: () => scheduleService,
      getActions: async () => ({} as ActionsPluginStart),
      getSpaces: async () => undefined,
      getFeedbackLoopEnabled: async () => feedbackLoopEnabled,
      logger: loggingSystemMock.createLogger(),
    });
  });

  it('registers reads as read routes and decisions as write routes', () => {
    expect(routes[`GET:${aiIndexImprovementsPath}`].config).toMatchObject({
      access: 'internal',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
    });
    for (const path of [
      improvementApprovePath,
      improvementRejectPath,
      aiIndexFeedbackAnalysisRunPath,
    ]) {
      expect(routes[`POST:${path}`].config).toMatchObject({
        access: 'internal',
        security: { authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] } },
      });
    }
  });

  it.each([
    ['the context engine setting is off', () => (featureFlagEnabled = false)],
    ['the feedback loop setting is off', () => (feedbackLoopEnabled = false)],
  ])('returns 404 on every route when %s', async (_name, disable) => {
    disable();

    await callRoute('GET', aiIndexImprovementsPath, {
      params: { aiIndexId: AI_INDEX_ID },
      query: { from: 0, size: 25 },
    });
    await approve();
    await reject();
    await callRoute('POST', aiIndexFeedbackAnalysisRunPath, {
      params: { aiIndexId: AI_INDEX_ID },
    });

    expect(response.notFound).toHaveBeenCalledTimes(4);
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

  describe('approve', () => {
    it('applies the change and records who approved it', async () => {
      await approve();

      expect(applyImprovementMock).toHaveBeenCalledWith(
        expect.objectContaining({ improvement_id: IMPROVEMENT_ID }),
        expect.objectContaining({ spaceId: 'default' })
      );
      expect(improvements.transition).toHaveBeenCalledWith(IMPROVEMENT_ID, 'applied', {
        by: 'reviewer',
        applied_target_id: 'ki-new',
      });
      expect(response.ok).toHaveBeenCalledWith({
        body: { improvement: expect.objectContaining({ status: 'applied' }) },
      });
    });

    it('applies on the caller’s own client, not a stored one', async () => {
      const context = createContext();
      const esClient = (await context.core).elasticsearch.client.asCurrentUser;

      await routes[`POST:${improvementApprovePath}`].handler(
        context,
        httpServerMock.createKibanaRequest({
          params: { aiIndexId: AI_INDEX_ID, improvementId: IMPROVEMENT_ID },
        }),
        response
      );

      expect(applyImprovementMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ esClient })
      );
    });

    it('records an apply failure on the improvement so it can be retried', async () => {
      applyImprovementMock.mockRejectedValue(new ApplyImprovementError('Destination is a pattern'));

      await approve();

      expect(improvements.transition).toHaveBeenCalledWith(IMPROVEMENT_ID, 'failed', {
        by: 'reviewer',
        error: 'Destination is a pattern',
      });
      expect(response.badRequest).toHaveBeenCalledWith({
        body: { message: 'Destination is a pattern' },
      });
    });

    it('refuses to approve one that is already decided', async () => {
      improvements.get.mockResolvedValue(improvement({ status: 'rejected' }));

      await approve();

      expect(applyImprovementMock).not.toHaveBeenCalled();
      expect(response.conflict).toHaveBeenCalled();
    });

    it('still offers a failed one, because nothing was written', async () => {
      improvements.get.mockResolvedValue(improvement({ status: 'failed' }));

      await approve();

      expect(applyImprovementMock).toHaveBeenCalled();
    });

    it('404s an improvement belonging to a different AI index', async () => {
      improvements.get.mockResolvedValue(improvement({ ai_index_id: 'other' }));

      await approve();

      expect(response.notFound).toHaveBeenCalled();
      expect(applyImprovementMock).not.toHaveBeenCalled();
    });

    it('returns 409 when someone else decided it first', async () => {
      improvements.transition.mockRejectedValue(new ImprovementConflictError([IMPROVEMENT_ID]));

      await approve();

      expect(response.conflict).toHaveBeenCalled();
    });

    it('audits both the decision and its failure', async () => {
      await approve();
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: ImprovementAuditAction.APPROVE,
            outcome: 'success',
          }),
        })
      );

      auditLog.mockClear();
      applyImprovementMock.mockRejectedValue(new ApplyImprovementError('nope'));
      await approve();

      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: ImprovementAuditAction.APPROVE,
            outcome: 'failure',
          }),
        })
      );
    });
  });

  describe('reject', () => {
    it('records the reviewer and their reason', async () => {
      await reject({ reason: 'The KI already covers this' });

      expect(improvements.transition).toHaveBeenCalledWith(IMPROVEMENT_ID, 'rejected', {
        by: 'reviewer',
        reason: 'The KI already covers this',
      });
      expect(response.ok).toHaveBeenCalledWith({
        body: { improvement: expect.objectContaining({ status: 'rejected' }) },
      });
    });

    it('refuses to reject one that was already applied', async () => {
      improvements.get.mockResolvedValue(improvement({ status: 'applied' }));

      await reject();

      expect(improvements.transition).not.toHaveBeenCalled();
      expect(response.conflict).toHaveBeenCalled();
    });

    it('changes nothing in the AI index', async () => {
      await reject();

      expect(applyImprovementMock).not.toHaveBeenCalled();
    });
  });

  describe('run now', () => {
    it('starts a run and returns its execution id', async () => {
      await callRoute('POST', aiIndexFeedbackAnalysisRunPath, {
        params: { aiIndexId: AI_INDEX_ID },
      });

      expect(scheduleService.run).toHaveBeenCalledWith(
        expect.objectContaining({ aiIndexId: AI_INDEX_ID, spaceId: 'default' })
      );
      expect(response.ok).toHaveBeenCalledWith({ body: { execution_id: 'execution-1' } });
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
