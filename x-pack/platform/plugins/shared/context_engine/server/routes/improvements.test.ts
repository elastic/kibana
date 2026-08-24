/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  aiIndexImprovementsPath,
  improvementApprovePath,
  improvementRejectPath,
  improvementsPath,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { ImprovementEnvelope, ProposedImprovement } from '../../common/http_api/improvements';
import { OPEN_IMPROVEMENT_STATUSES } from '../../common/http_api/improvements';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { applyImprovement, ApplyImprovementError } from '../improvements/apply';
import type { ImprovementsServiceApi } from '../improvements/service';
import type { WorkflowProvider } from '../workflows/provider';
import { registerImprovementRoutes } from './improvements';

// Keeps the real `ApplyImprovementError`, which the route branches on.
jest.mock('../improvements/apply', () => ({
  ...jest.requireActual('../improvements/apply'),
  applyImprovement: jest.fn(),
}));

const applyImprovementMock = applyImprovement as jest.MockedFunction<typeof applyImprovement>;

interface RegisteredRoute {
  config: {
    path: string;
    access: string;
    security: { authz: { requiredPrivileges: string[] } };
  };
  handler: RequestHandler;
  validate:
    | false
    | { request?: { params?: Type<unknown>; query?: Type<unknown>; body?: Type<unknown> } };
}

const improvement = (overrides: Partial<ImprovementEnvelope> = {}): ImprovementEnvelope => ({
  improvement_id: 'imp-1',
  ai_index_id: 'customer_support',
  status: 'proposed',
  action: 'add_ki',
  title: 'Document the refund window',
  rationale: 'Three unanswered questions mentioned refunds.',
  payload: { ki: { title: 'Refund window', content: '30 days' } },
  suggested_at: '2026-08-19T09:00:00.000Z',
  ...overrides,
});

const proposal = (overrides: Partial<ProposedImprovement> = {}): ProposedImprovement => ({
  action: 'add_ki',
  title: 'Document the refund window',
  rationale: 'Three unanswered questions mentioned refunds.',
  ki: { title: 'Refund window', content: '30 days' },
  ...overrides,
});

describe('improvements routes', () => {
  let routes: Record<string, RegisteredRoute>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let aiIndexService: jest.Mocked<Pick<AiIndexService, 'get'>>;
  let improvementsService: jest.Mocked<ImprovementsServiceApi>;
  let workflowProvider: WorkflowProvider | undefined;
  let auditLogger: { log: jest.Mock };
  let contextEngineEnabled: boolean;
  let feedbackLoopEnabled: boolean;

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => contextEngineEnabled) },
        },
        security: {
          audit: { logger: auditLogger },
          authc: { getCurrentUser: () => ({ username: 'reviewer' }) },
        },
        elasticsearch: { client: { asCurrentUser: { id: 'as-current-user' } } },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const getRoute = (method: string, path: string): RegisteredRoute => {
    const route = routes[`${method}:${path}`];
    expect(route).toBeDefined();
    return route;
  };

  const callRoute = async (method: string, path: string, request: Record<string, unknown> = {}) => {
    const { handler } = getRoute(method, path);
    return handler(createContext(), httpServerMock.createKibanaRequest(request), response);
  };

  const validateBody = (method: string, path: string, body: unknown) => {
    const { validate } = getRoute(method, path);
    if (validate === false || !validate.request?.body) {
      throw new Error(`Route ${method}:${path} has no body schema`);
    }
    return validate.request.body.validate(body);
  };

  const validateQuery = (method: string, path: string, query: unknown) => {
    const { validate } = getRoute(method, path);
    if (validate === false || !validate.request?.query) {
      throw new Error(`Route ${method}:${path} has no query schema`);
    }
    return validate.request.query.validate(query);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    routes = {};
    contextEngineEnabled = true;
    feedbackLoopEnabled = true;
    response = httpServerMock.createResponseFactory();
    auditLogger = { log: jest.fn() };
    aiIndexService = { get: jest.fn().mockResolvedValue({ id: 'customer_support' }) };
    improvementsService = {
      ensureIndex: jest.fn(),
      write: jest.fn(),
      update: jest.fn(),
      list: jest.fn().mockResolvedValue({ improvements: [], total: 0 }),
      history: jest.fn().mockResolvedValue([]),
      getByIds: jest.fn().mockResolvedValue([]),
      getById: jest.fn(),
    };
    workflowProvider = {} as WorkflowProvider;
    applyImprovementMock.mockResolvedValue('ki-new');

    const createVersionedRoute = (method: string) => (config: RegisteredRoute['config']) => ({
      addVersion: (
        versionConfig: { validate: RegisteredRoute['validate'] },
        handler: RequestHandler
      ) => {
        routes[`${method}:${config.path}`] = { config, handler, validate: versionConfig.validate };
      },
    });

    const router = {
      versioned: {
        get: jest.fn(createVersionedRoute('GET')),
        post: jest.fn(createVersionedRoute('POST')),
        put: jest.fn(createVersionedRoute('PUT')),
        delete: jest.fn(createVersionedRoute('DELETE')),
      },
    } as unknown as IRouter;

    registerImprovementRoutes({
      router,
      getAiIndexService: () => aiIndexService as unknown as AiIndexService,
      getImprovementsService: () => improvementsService,
      getWorkflowProvider: () => workflowProvider,
      getSpaces: async () => undefined,
      getFeedbackLoopEnabled: async () => feedbackLoopEnabled,
      logger: loggingSystemMock.createLogger(),
    });
  });

  it('registers routes with the expected access and privileges', () => {
    expect(getRoute('GET', aiIndexImprovementsPath).config).toMatchObject({
      access: 'internal',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
    });
    for (const path of [improvementsPath, improvementApprovePath, improvementRejectPath]) {
      expect(getRoute('POST', path).config).toMatchObject({
        access: 'internal',
        security: { authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] } },
      });
    }
  });

  it('404s every route while the context engine setting is off', async () => {
    contextEngineEnabled = false;

    await callRoute('GET', aiIndexImprovementsPath, { params: { aiIndexId: 'a' } });
    await callRoute('POST', improvementsPath, { body: {} });
    await callRoute('POST', improvementApprovePath, { params: { improvementId: 'imp-1' } });
    await callRoute('POST', improvementRejectPath, { params: { improvementId: 'imp-1' } });

    expect(response.notFound).toHaveBeenCalledTimes(4);
    expect(improvementsService.write).not.toHaveBeenCalled();
    expect(improvementsService.update).not.toHaveBeenCalled();
  });

  it('404s every route while the feedback loop setting is off', async () => {
    feedbackLoopEnabled = false;

    await callRoute('GET', aiIndexImprovementsPath, { params: { aiIndexId: 'a' } });
    await callRoute('POST', improvementsPath, { body: {} });
    await callRoute('POST', improvementApprovePath, { params: { improvementId: 'imp-1' } });
    await callRoute('POST', improvementRejectPath, { params: { improvementId: 'imp-1' } });

    expect(response.notFound).toHaveBeenCalledTimes(4);
  });

  describe('GET improvements', () => {
    it('lists only the open statuses by default', async () => {
      await callRoute('GET', aiIndexImprovementsPath, {
        params: { aiIndexId: 'customer_support' },
        query: { from: 0, size: 25 },
      });

      expect(improvementsService.list).toHaveBeenCalledWith('default', {
        aiIndexId: 'customer_support',
        statuses: OPEN_IMPROVEMENT_STATUSES,
        from: 0,
        size: 25,
      });
      expect(response.ok).toHaveBeenCalledWith({ body: { improvements: [], total: 0 } });
    });

    it('honours an explicit status filter', async () => {
      await callRoute('GET', aiIndexImprovementsPath, {
        params: { aiIndexId: 'customer_support' },
        query: { status: ['rejected'], from: 0, size: 25 },
      });

      expect(improvementsService.list).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({ statuses: ['rejected'] })
      );
    });

    it('bounds pagination so deep paging cannot exceed the result window', () => {
      expect(() => validateQuery('GET', aiIndexImprovementsPath, { size: 1000 })).toThrow();
      expect(() => validateQuery('GET', aiIndexImprovementsPath, { from: 10000 })).toThrow();
    });
  });

  describe('POST improvements', () => {
    it('records a run’s suggestions', async () => {
      await callRoute('POST', improvementsPath, {
        body: {
          ai_index_id: 'customer_support',
          run_id: 'exec-1',
          improvements: [proposal()],
        },
      });

      expect(improvementsService.write).toHaveBeenCalledWith('default', [
        expect.objectContaining({
          ai_index_id: 'customer_support',
          status: 'proposed',
          action: 'add_ki',
          run_id: 'exec-1',
        }),
      ]);
      expect(response.ok).toHaveBeenCalledWith({
        body: { recorded: [expect.any(String)], skipped: 0 },
      });
    });

    it('skips a suggestion that repeats an already resolved one', async () => {
      improvementsService.getByIds.mockImplementation(async (_spaceId, improvementIds) => [
        improvement({ improvement_id: improvementIds[0], status: 'rejected' }),
      ]);

      await callRoute('POST', improvementsPath, {
        body: { ai_index_id: 'customer_support', improvements: [proposal()] },
      });

      expect(improvementsService.write).toHaveBeenCalledWith('default', []);
      expect(response.ok).toHaveBeenCalledWith({ body: { recorded: [], skipped: 1 } });
    });

    it('refreshes a suggestion that is still open', async () => {
      improvementsService.getByIds.mockImplementation(async (_spaceId, improvementIds) => [
        improvement({ improvement_id: improvementIds[0], status: 'proposed' }),
      ]);

      await callRoute('POST', improvementsPath, {
        body: { ai_index_id: 'customer_support', improvements: [proposal()] },
      });

      expect(improvementsService.write).toHaveBeenCalledWith('default', [expect.anything()]);
      expect(response.ok).toHaveBeenCalledWith({
        body: { recorded: [expect.any(String)], skipped: 0 },
      });
    });

    it('404s an unknown AI index before writing anything', async () => {
      aiIndexService.get.mockRejectedValue(new AiIndexNotFoundError('missing'));

      await callRoute('POST', improvementsPath, {
        body: { ai_index_id: 'missing', improvements: [proposal()] },
      });

      expect(response.notFound).toHaveBeenCalled();
      expect(improvementsService.write).not.toHaveBeenCalled();
    });

    it('bounds the run size and the workflow definition length', () => {
      expect(() =>
        validateBody('POST', improvementsPath, {
          ai_index_id: 'customer_support',
          improvements: new Array(21).fill(proposal()),
        })
      ).toThrow();
      expect(() =>
        validateBody('POST', improvementsPath, {
          ai_index_id: 'customer_support',
          improvements: [proposal({ workflow_yaml: 'x'.repeat(65537) })],
        })
      ).toThrow();
    });
  });

  describe('POST approve', () => {
    it('applies the change and marks the improvement applied', async () => {
      improvementsService.getById.mockResolvedValue(improvement());

      await callRoute('POST', improvementApprovePath, { params: { improvementId: 'imp-1' } });

      expect(applyImprovementMock).toHaveBeenCalledWith(
        improvement(),
        expect.objectContaining({ spaceId: 'default', workflows: workflowProvider })
      );
      expect(improvementsService.update).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({
          status: 'applied',
          applied_at: expect.any(String),
          resolution: { by: 'reviewer', applied_target_id: 'ki-new' },
        })
      );
      expect(response.ok).toHaveBeenCalledWith({
        body: { improvement: expect.objectContaining({ status: 'applied' }) },
      });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'context_engine_improvement_approve',
            outcome: 'success',
          }),
        })
      );
    });

    it('records an apply failure without losing the suggestion', async () => {
      improvementsService.getById.mockResolvedValue(improvement());
      applyImprovementMock.mockRejectedValue(new ApplyImprovementError('invalid workflow'));

      await callRoute('POST', improvementApprovePath, { params: { improvementId: 'imp-1' } });

      expect(improvementsService.update).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({
          status: 'failed',
          payload: improvement().payload,
          resolution: { by: 'reviewer', error: 'invalid workflow' },
        })
      );
      expect(response.badRequest).toHaveBeenCalledWith({ body: { message: 'invalid workflow' } });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'context_engine_improvement_approve',
            outcome: 'failure',
          }),
        })
      );
    });

    it('lets an unexpected failure surface instead of marking the suggestion failed', async () => {
      improvementsService.getById.mockResolvedValue(improvement());
      applyImprovementMock.mockRejectedValue(new Error('cluster unavailable'));

      await expect(
        callRoute('POST', improvementApprovePath, { params: { improvementId: 'imp-1' } })
      ).rejects.toThrow('cluster unavailable');
      expect(improvementsService.update).not.toHaveBeenCalled();
    });

    it('retries a previously failed suggestion', async () => {
      improvementsService.getById.mockResolvedValue(
        improvement({ status: 'failed', resolution: { error: 'invalid workflow' } })
      );

      await callRoute('POST', improvementApprovePath, { params: { improvementId: 'imp-1' } });

      expect(applyImprovementMock).toHaveBeenCalled();
      expect(improvementsService.update).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({ status: 'applied' })
      );
    });

    it('404s a suggestion that does not exist', async () => {
      improvementsService.getById.mockResolvedValue(undefined);

      await callRoute('POST', improvementApprovePath, { params: { improvementId: 'gone' } });

      expect(response.notFound).toHaveBeenCalled();
      expect(applyImprovementMock).not.toHaveBeenCalled();
    });

    it('409s a suggestion that was already applied', async () => {
      improvementsService.getById.mockResolvedValue(improvement({ status: 'applied' }));

      await callRoute('POST', improvementApprovePath, { params: { improvementId: 'imp-1' } });

      expect(response.conflict).toHaveBeenCalled();
      expect(applyImprovementMock).not.toHaveBeenCalled();
    });

    it('409s a suggestion that was already rejected', async () => {
      improvementsService.getById.mockResolvedValue(improvement({ status: 'rejected' }));

      await callRoute('POST', improvementApprovePath, { params: { improvementId: 'imp-1' } });

      expect(response.conflict).toHaveBeenCalled();
      expect(applyImprovementMock).not.toHaveBeenCalled();
    });
  });

  describe('POST reject', () => {
    it('records the rejection with who made it and when', async () => {
      improvementsService.getById.mockResolvedValue(improvement());

      await callRoute('POST', improvementRejectPath, { params: { improvementId: 'imp-1' } });

      expect(improvementsService.update).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({
          status: 'rejected',
          rejected_at: expect.any(String),
          resolution: { by: 'reviewer' },
        })
      );
      expect(response.ok).toHaveBeenCalledWith({
        body: { improvement: expect.objectContaining({ status: 'rejected' }) },
      });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({ action: 'context_engine_improvement_reject' }),
        })
      );
    });

    it('409s a suggestion that was already applied', async () => {
      improvementsService.getById.mockResolvedValue(improvement({ status: 'applied' }));

      await callRoute('POST', improvementRejectPath, { params: { improvementId: 'imp-1' } });

      expect(response.conflict).toHaveBeenCalled();
      expect(improvementsService.update).not.toHaveBeenCalled();
    });

    it('404s a suggestion that does not exist', async () => {
      improvementsService.getById.mockResolvedValue(undefined);

      await callRoute('POST', improvementRejectPath, { params: { improvementId: 'gone' } });

      expect(response.notFound).toHaveBeenCalled();
      expect(improvementsService.update).not.toHaveBeenCalled();
    });
  });
});
