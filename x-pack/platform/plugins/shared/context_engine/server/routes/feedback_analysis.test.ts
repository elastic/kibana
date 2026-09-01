/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { aiIndexFeedbackContextPath, improvementsPath } from '../../common/constants';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import { IMPROVEMENT_ACTIONS } from '../../common/http_api/improvement_actions';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { InvalidSignalWindowError } from '../feedback_analysis/errors';
import { buildFeedbackContext } from '../feedback_analysis/context';
import { recordImprovements } from '../feedback_analysis/record_improvements';
import type { ImprovementsServiceApi } from '../improvements/service';
import { registerFeedbackAnalysisRoutes } from './feedback_analysis';

jest.mock('../feedback_analysis/context');
jest.mock('../feedback_analysis/record_improvements');

const buildFeedbackContextMock = buildFeedbackContext as jest.MockedFunction<
  typeof buildFeedbackContext
>;
const recordImprovementsMock = recordImprovements as jest.MockedFunction<typeof recordImprovements>;

interface RegisteredRoute {
  config: { path: string };
  handler: RequestHandler;
  validate: { request?: { params?: unknown; body?: unknown } } | false;
}

const VALID_BODY = {
  ai_index_id: 'orders',
  agent_run_id: 'run-1',
  signal_window: { from: '2026-08-25T12:00:00.000Z', to: '2026-09-01T12:00:00.000Z' },
  signal_spaces: ['default'],
  improvements: [{ action: 'add_ki', title: 'Add', rationale: 'Because', signal_ids: ['a'] }],
};

describe('registerFeedbackAnalysisRoutes', () => {
  let routes: Record<string, RegisteredRoute>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let aiIndexService: jest.Mocked<Pick<AiIndexService, 'get'>>;
  let improvementsService: ImprovementsServiceApi;
  let improvementsClients: unknown[];
  let auditLogger: { log: jest.Mock };
  let featureFlagEnabled: boolean;
  let feedbackLoopEnabled: boolean;

  const currentUserClient = Symbol('asCurrentUser');

  const createContext = () =>
    ({
      core: Promise.resolve({
        elasticsearch: { client: { asCurrentUser: currentUserClient } },
        security: { audit: { logger: auditLogger } },
        uiSettings: { client: { get: async () => featureFlagEnabled } },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const callRoute = async (method: string, path: string, request: Record<string, unknown> = {}) => {
    const route = routes[`${method}:${path}`];
    expect(route).toBeDefined();
    return route.handler(createContext(), httpServerMock.createKibanaRequest(request), response);
  };

  const validateBody = (body: unknown) => {
    const route = routes[`POST:${improvementsPath}`];
    const schema = (route.validate as { request: { body: { validate: (b: unknown) => unknown } } })
      .request.body;
    return schema.validate(body);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    routes = {};
    featureFlagEnabled = true;
    feedbackLoopEnabled = true;
    response = httpServerMock.createResponseFactory();
    auditLogger = { log: jest.fn() };
    aiIndexService = { get: jest.fn().mockResolvedValue({ id: 'orders' } as AiIndexHttpItem) };
    improvementsService = {} as ImprovementsServiceApi;
    improvementsClients = [];

    buildFeedbackContextMock.mockResolvedValue({
      has_signals: true,
      briefing: 'brief',
    } as never);
    recordImprovementsMock.mockResolvedValue({ recorded: [], skipped: [] });

    const createVersionedRoute = (method: string) => (config: RegisteredRoute['config']) => ({
      addVersion: (
        versionConfig: { validate: RegisteredRoute['validate'] },
        handler: RequestHandler
      ) => {
        routes[`${method}:${config.path}`] = {
          config,
          handler,
          validate: versionConfig.validate,
        };
      },
    });

    registerFeedbackAnalysisRoutes({
      router: {
        versioned: {
          get: jest.fn(createVersionedRoute('GET')),
          post: jest.fn(createVersionedRoute('POST')),
        },
      } as unknown as IRouter,
      getAiIndexService: () => aiIndexService as unknown as AiIndexService,
      getImprovementsService: (esClient) => {
        improvementsClients.push(esClient);
        return improvementsService;
      },
      getFeedbackLoopEnabled: async () => feedbackLoopEnabled,
    });
  });

  it('returns 404 on both routes when the context engine is disabled', async () => {
    featureFlagEnabled = false;

    await callRoute('GET', aiIndexFeedbackContextPath, { params: { aiIndexId: 'orders' } });
    await callRoute('POST', improvementsPath, { body: VALID_BODY });

    expect(response.notFound).toHaveBeenCalledTimes(2);
    expect(buildFeedbackContextMock).not.toHaveBeenCalled();
    expect(recordImprovementsMock).not.toHaveBeenCalled();
  });

  describe(`GET ${aiIndexFeedbackContextPath}`, () => {
    it('returns the assembled context', async () => {
      await callRoute('GET', aiIndexFeedbackContextPath, { params: { aiIndexId: 'orders' } });

      expect(buildFeedbackContextMock).toHaveBeenCalledWith('orders', expect.anything());
      expect(response.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({ has_signals: true }),
      });
    });

    it('reads as the caller, not as Kibana', async () => {
      await callRoute('GET', aiIndexFeedbackContextPath, { params: { aiIndexId: 'orders' } });

      expect(buildFeedbackContextMock.mock.calls[0][1]).toMatchObject({
        esClient: currentUserClient,
      });
      expect(improvementsClients).toEqual([currentUserClient]);
    });

    it('returns 404 for an AI index that does not exist', async () => {
      buildFeedbackContextMock.mockRejectedValue(new AiIndexNotFoundError('orders'));

      await callRoute('GET', aiIndexFeedbackContextPath, { params: { aiIndexId: 'orders' } });

      expect(response.notFound).toHaveBeenCalled();
    });

    it('returns 400 when the index stores a window it cannot resolve', async () => {
      buildFeedbackContextMock.mockRejectedValue(new InvalidSignalWindowError('bad window'));

      await callRoute('GET', aiIndexFeedbackContextPath, { params: { aiIndexId: 'orders' } });

      expect(response.badRequest).toHaveBeenCalledWith({ body: { message: 'bad window' } });
    });

    it('returns 404 when the feedback loop is off', async () => {
      feedbackLoopEnabled = false;

      await callRoute('GET', aiIndexFeedbackContextPath, { params: { aiIndexId: 'orders' } });

      expect(response.notFound).toHaveBeenCalled();
      expect(buildFeedbackContextMock).not.toHaveBeenCalled();
    });
  });

  describe(`POST ${improvementsPath}`, () => {
    it('records what the run proposed and reports the outcome', async () => {
      recordImprovementsMock.mockResolvedValue({
        recorded: [{ improvement_id: 'imp-1', action: 'add_ki', title: 'Add' }],
        skipped: [],
      });

      await callRoute('POST', improvementsPath, { body: VALID_BODY });

      expect(response.ok).toHaveBeenCalledWith({
        body: {
          recorded: [{ improvement_id: 'imp-1', action: 'add_ki', title: 'Add' }],
          skipped: [],
        },
      });
    });

    it('reads the policy off the index rather than trusting the request', async () => {
      aiIndexService.get.mockResolvedValue({
        id: 'orders',
        feedback_analysis: { enabled: true, allowed_actions: ['add_ki'] },
      } as unknown as AiIndexHttpItem);

      await callRoute('POST', improvementsPath, {
        body: { ...VALID_BODY, allowed_actions: [...IMPROVEMENT_ACTIONS] },
      });

      expect(aiIndexService.get).toHaveBeenCalledWith('orders');
      expect(recordImprovementsMock).toHaveBeenCalledWith(
        expect.objectContaining({ allowedActions: ['add_ki'] })
      );
    });

    it('permits the full taxonomy on an index that never configured a policy', async () => {
      await callRoute('POST', improvementsPath, { body: VALID_BODY });

      expect(recordImprovementsMock).toHaveBeenCalledWith(
        expect.objectContaining({ allowedActions: [...IMPROVEMENT_ACTIONS] })
      );
    });

    it('writes as the caller', async () => {
      await callRoute('POST', improvementsPath, { body: VALID_BODY });

      expect(improvementsClients).toEqual([currentUserClient]);
    });

    it('audits how much was recorded', async () => {
      recordImprovementsMock.mockResolvedValue({
        recorded: [{ improvement_id: 'imp-1', action: 'add_ki', title: 'Add' }],
        skipped: [],
      });

      await callRoute('POST', improvementsPath, { body: VALID_BODY });

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ event: expect.objectContaining({ outcome: 'success' }) })
      );
    });

    it('audits a failure too', async () => {
      recordImprovementsMock.mockRejectedValue(new AiIndexNotFoundError('orders'));

      await callRoute('POST', improvementsPath, { body: VALID_BODY });

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ event: expect.objectContaining({ outcome: 'failure' }) })
      );
      expect(response.notFound).toHaveBeenCalled();
    });

    it('returns 404 when the feedback loop is off', async () => {
      feedbackLoopEnabled = false;

      await callRoute('POST', improvementsPath, { body: VALID_BODY });

      expect(response.notFound).toHaveBeenCalled();
      expect(recordImprovementsMock).not.toHaveBeenCalled();
    });
  });

  describe('body validation', () => {
    it('accepts a well-formed body', () => {
      expect(() => validateBody(VALID_BODY)).not.toThrow();
    });

    it('defaults an absent improvements array to empty, so a run that found nothing can report it', () => {
      const validated = validateBody({
        ai_index_id: 'orders',
        agent_run_id: 'run-1',
        signal_window: VALID_BODY.signal_window,
      }) as { improvements: unknown[]; signal_spaces: unknown[] };

      expect(validated.improvements).toEqual([]);
      expect(validated.signal_spaces).toEqual([]);
    });

    it('passes proposals through unvalidated, leaving per-proposal reasons to the recorder', () => {
      const validated = validateBody({
        ...VALID_BODY,
        improvements: [{ anything: 'at all' }],
      }) as { improvements: unknown[] };

      expect(validated.improvements).toEqual([{ anything: 'at all' }]);
    });

    it('requires the run to say which index and which execution it was', () => {
      expect(() => validateBody({ ...VALID_BODY, ai_index_id: undefined })).toThrow();
      expect(() => validateBody({ ...VALID_BODY, agent_run_id: undefined })).toThrow();
      expect(() => validateBody({ ...VALID_BODY, signal_window: undefined })).toThrow();
    });

    it('bounds the request body', () => {
      expect(() =>
        validateBody({
          ...VALID_BODY,
          improvements: Array.from({ length: 201 }, () => ({})),
        })
      ).toThrow();
      expect(() => validateBody({ ...VALID_BODY, agent_run_id: 'x'.repeat(1025) })).toThrow();
    });

    it('rejects an AI index id that is not one', () => {
      expect(() => validateBody({ ...VALID_BODY, ai_index_id: 'Not An Id!' })).toThrow();
    });
  });
});
