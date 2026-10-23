/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { AI_INDEX_SUGGEST_AUTOMATION_CONTEXT_PATH } from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import { AiIndexNotFoundError, AiIndexNotReadableError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { buildAutomationSuggestionContext } from '../automation_suggestions/build_context';
import type { WorkflowEnablementApi } from '../feedback_analysis/schedule';
import { registerAutomationSuggestionRoutes } from './automation_suggestions';

jest.mock('../automation_suggestions/build_context');

const buildAutomationSuggestionContextMock =
  buildAutomationSuggestionContext as jest.MockedFunction<typeof buildAutomationSuggestionContext>;

interface RegisteredRoute {
  config: {
    path: string;
    access: string;
    security: { authz: { requiredPrivileges: string[] } };
  };
  handler: RequestHandler;
}

describe('automation suggestion routes', () => {
  let routes: Record<string, RegisteredRoute>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let featureFlagEnabled: boolean;
  let aiIndexService: { get: jest.Mock };
  let workflows: WorkflowEnablementApi;
  let getWorkflows: jest.Mock;

  const aiIndexItem = {
    id: 'support',
    dest: { type: 'index', value: 'ai-index-idx-support' },
    sources: [],
    automations: [],
    traces: [],
  };

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => featureFlagEnabled) },
        },
        elasticsearch: { client: { asCurrentUser: {} } },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const getRoute = (): RegisteredRoute => {
    const route = routes[`GET:${AI_INDEX_SUGGEST_AUTOMATION_CONTEXT_PATH}`];
    expect(route).toBeDefined();
    return route;
  };

  const callRoute = async (params: Record<string, unknown> = { aiIndexId: 'support' }) => {
    const { handler } = getRoute();
    return handler(createContext(), httpServerMock.createKibanaRequest({ params }), response);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    routes = {};
    featureFlagEnabled = true;
    response = httpServerMock.createResponseFactory();
    aiIndexService = { get: jest.fn().mockResolvedValue(aiIndexItem) };
    workflows = { updateWorkflow: jest.fn(), getWorkflow: jest.fn() };
    getWorkflows = jest.fn().mockResolvedValue(workflows);
    buildAutomationSuggestionContextMock.mockResolvedValue({
      sources: [],
      automations: [],
      traces: [],
      signals_summary: { total: 0, by_tag: [] },
    });

    const router = {
      versioned: {
        get: jest.fn((config: RegisteredRoute['config']) => ({
          addVersion: (_versionConfig: unknown, handler: RequestHandler) => {
            routes[`GET:${config.path}`] = { config, handler };
          },
        })),
      },
    } as unknown as IRouter;

    registerAutomationSuggestionRoutes({
      router,
      getAiIndexService: () => aiIndexService as unknown as AiIndexService,
      getSpaces: async () => undefined,
      getWorkflows,
    });
  });

  it('registers an internal read route', () => {
    expect(getRoute().config).toMatchObject({
      access: 'internal',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
    });
  });

  it('returns 404 when the context engine is disabled', async () => {
    featureFlagEnabled = false;

    await callRoute();

    expect(response.notFound).toHaveBeenCalled();
    expect(aiIndexService.get).not.toHaveBeenCalled();
  });

  it('builds and returns the pre-explored context for the requested AI index', async () => {
    buildAutomationSuggestionContextMock.mockResolvedValue({
      sources: [{ type: 'esql', value: 'FROM tickets', row_count: 10 }],
      automations: [],
      traces: [],
      signals_summary: { total: 2, by_tag: [{ tag: 'coverage_gap', count: 2 }] },
    });

    await callRoute();

    expect(aiIndexService.get).toHaveBeenCalledWith('support', 'default');
    expect(buildAutomationSuggestionContextMock).toHaveBeenCalledWith(
      aiIndexItem,
      expect.objectContaining({ spaceId: 'default', workflows })
    );
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        sources: [{ type: 'esql', value: 'FROM tickets', row_count: 10 }],
        automations: [],
        traces: [],
        signals_summary: { total: 2, by_tag: [{ tag: 'coverage_gap', count: 2 }] },
      },
    });
  });

  it('returns 404 when the AI index does not exist', async () => {
    aiIndexService.get.mockRejectedValue(new AiIndexNotFoundError('support'));

    await callRoute();

    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "AI index 'support' not found" },
    });
    expect(buildAutomationSuggestionContextMock).not.toHaveBeenCalled();
  });

  it('returns 403 when the AI index is not readable', async () => {
    aiIndexService.get.mockRejectedValue(new AiIndexNotReadableError('support'));

    await callRoute();

    expect(response.forbidden).toHaveBeenCalledWith({
      body: {
        message:
          "AI index 'support' is not readable. Reading it needs the Elasticsearch 'read' and 'view_index_metadata' privileges on its backing indices.",
      },
    });
    expect(buildAutomationSuggestionContextMock).not.toHaveBeenCalled();
  });

  it('rethrows unexpected errors instead of mapping them to a response', async () => {
    aiIndexService.get.mockRejectedValue(new Error('boom'));

    await expect(callRoute()).rejects.toThrow('boom');
  });
});
