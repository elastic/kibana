/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { DiagnosticResult } from '@elastic/elasticsearch';
import { actionsClientMock, actionsMock } from '@kbn/actions-plugin/server/mocks';
import type { ActionResult, ConnectorType } from '@kbn/actions-plugin/server';
import type { Type } from '@kbn/config-schema';
import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { asSpaceId } from '@kbn/core-spaces-common';
import { loggerMock } from '@kbn/logging-mocks';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { WorkflowsManagementApiActions } from '@kbn/workflows';
import { registerAiIndexRoutes } from './ai_indices';
import {
  MAX_AI_INDEX_QUERY_LENGTH,
  MAX_AI_INDEX_QUERY_LIMIT,
  MAX_AI_INDEX_QUERY_PARAM_KEY_LENGTH,
  MAX_AI_INDEX_QUERY_PARAM_VALUE_LENGTH,
  MAX_AI_INDEX_QUERY_PARAMS,
  MAX_AI_INDEX_SOURCES,
  MAX_AI_INDEX_SOURCE_VALUE_LENGTH,
  MAX_AI_INDICES,
  MAX_AI_INDEX_TRACES,
  MAX_AI_INDEX_TRACE_INDEX_EXPRESSIONS,
  AI_INDEX_BY_ID_PATH,
  AI_INDEX_DESCRIBE_PATH,
  AI_INDEX_FEEDBACK_ANALYSIS_PATH,
  AI_INDEX_KI_BY_ID_PATH,
  AI_INDEX_KI_LIST_PATH,
  AI_INDEX_PATH,
  AI_INDEX_QUERY_PATH,
} from '../../common/constants';
import { aiIndicesIndexName } from '../ai_indices/storage';
import { kiIdQuery } from '../ai_indices/ki_get';
import { createAiIndexIdentityDslFilter } from '../utils/ai_index_identity_filter';
import { apiPrivileges } from '../../common/features';
import type { AiIndexHttpItem, DescribeAiIndexResponse } from '../../common/http_api/ai_indices';
import { IMPROVEMENT_ACTIONS } from '../../common/http_api/improvement_actions';
import {
  InvalidAiIndexDestError,
  AiIndexConflictError,
  AiIndexDescribeResponseTooLargeError,
  AiIndexNotFoundError,
  AiIndexNotReadableError,
  AiIndexAlreadyExistsError,
  AiIndexQueryResponseTooLargeError,
  InvalidAiIndexQueryError,
  KiNotFoundError,
} from '../ai_indices/errors';
import type { AiIndexDataReadServiceApi } from '../ai_indices/data_read_service';
import type { AiIndexService } from '../ai_indices/service';
import type { FeedbackAnalysisScheduleService } from '../feedback_analysis/schedule';
import type { ImprovementsServiceApi } from '../improvements/service';
import type { DeleteWorkflowsApi } from '../types';
import type { GetAiIndexDataReadServiceParams } from '../types';

interface RegisteredRoute {
  config: {
    path: string;
    access: string;
    security: { authz: { requiredPrivileges: string[]; extendedPrivileges?: string[] } };
  };
  handler: RequestHandler;
  validate:
    | false
    | { request?: { params?: Type<unknown>; query?: Type<unknown>; body?: Type<unknown> } };
}

const SUPPORTED_TYPE_IDS = [
  '.google_drive',
  '.one_drive',
  '.notion',
  '.amazon_s3',
  '.github',
  '.box',
  '.dropbox',
  '.google_cloud_storage',
  '.salesforce',
  '.zendesk',
];

const buildConnector = (id: string, actionTypeId: string): ActionResult => ({
  id,
  actionTypeId,
  name: `Connector ${id}`,
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: false,
  isConnectorTypeDeprecated: false,
});

const buildConnectorType = (id: string): ConnectorType =>
  ({
    id,
    name: `Type ${id}`,
    supportedFeatureIds: ['contextEngine'],
  } as unknown as ConnectorType);

const aiIndexItem: AiIndexHttpItem = {
  id: 'customer_support',
  description: 'Customer support context',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-customer_support' },
  automations: [{ type: 'workflow', value: 'nightly-refresh' }],
  sources: [{ type: 'esql', value: 'FROM ai-index-ds-customer_support | LIMIT 10' }],
  traces: [],
  date_created: '2026-07-08T12:10:30.000Z',
  date_modified: '2026-07-08T12:10:30.000Z',
};

const kiBackingIndex = '.ds-ai-index-ds-customer_support-2026.01.01-000001';

describe('ai indices routes', () => {
  let routes: Record<string, RegisteredRoute>;
  let aiIndexService: jest.Mocked<
    Pick<AiIndexService, 'create' | 'put' | 'get' | 'list' | 'delete' | 'setFeedbackAnalysis'>
  >;
  let improvementsService: jest.Mocked<Pick<ImprovementsServiceApi, 'deleteByAiIndex'>>;
  let workflowsManagementApi: jest.Mocked<DeleteWorkflowsApi>;
  let scheduleService: jest.Mocked<FeedbackAnalysisScheduleService>;
  let readService: jest.Mocked<AiIndexDataReadServiceApi>;
  let readServiceParams: GetAiIndexDataReadServiceParams[];
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let featureFlagEnabled: boolean;
  let actionsClient: ReturnType<typeof actionsClientMock.create>;
  let actions: ReturnType<typeof actionsMock.createStart>;
  let auditLogger: { log: jest.Mock };
  let esSearch: jest.Mock;
  let esEsqlQuery: jest.Mock;
  let esGet: jest.Mock;
  let esDeleteDataStream: jest.Mock;
  let esDeleteIndex: jest.Mock;
  let esInternalSearch: jest.Mock;
  let spacesStart: ReturnType<typeof spacesMock.createStart>;
  let improvementsClients: unknown[];
  let improvementsSpaceIds: string[];
  let getSpaces: jest.Mock;
  let getAgentBuilder: jest.Mock;
  let esResolveIndex: jest.Mock;
  const logger = loggerMock.create();
  const defaultSpaceId = 'default';

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => featureFlagEnabled) },
        },
        security: { audit: { logger: auditLogger } },
        elasticsearch: {
          client: {
            asCurrentUser: {
              search: esSearch,
              get: esGet,
              esql: { query: esEsqlQuery },
              indices: {
                deleteDataStream: esDeleteDataStream,
                delete: esDeleteIndex,
                resolveIndex: esResolveIndex,
              },
            },
            asInternalUser: {
              search: esInternalSearch,
            },
          },
        },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const getRoute = (method: string, path: string): RegisteredRoute => {
    const route = routes[`${method}:${path}`];
    expect(route).toBeDefined();
    return route;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    routes = {};
    featureFlagEnabled = true;
    response = httpServerMock.createResponseFactory();
    actionsClient = actionsClientMock.create();
    actions = actionsMock.createStart();
    actions.getActionsClientWithRequest.mockResolvedValue(actionsClient);
    actionsClient.listTypes.mockResolvedValue(SUPPORTED_TYPE_IDS.map(buildConnectorType));
    auditLogger = { log: jest.fn() };
    esSearch = jest.fn();
    esGet = jest.fn();
    esEsqlQuery = jest.fn();
    esDeleteDataStream = jest.fn().mockResolvedValue({ acknowledged: true });
    esDeleteIndex = jest.fn().mockResolvedValue({ acknowledged: true });
    esResolveIndex = jest.fn().mockResolvedValue({
      indices: [{ name: 'logs-default', attributes: ['open'] }],
      aliases: [],
      data_streams: [],
    });
    esInternalSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
    spacesStart = spacesMock.createStart();
    aiIndexService = {
      create: jest.fn(),
      put: jest.fn(),
      get: jest.fn().mockResolvedValue(aiIndexItem),
      list: jest.fn(),
      delete: jest.fn(),
      setFeedbackAnalysis: jest.fn(),
    };
    improvementsService = { deleteByAiIndex: jest.fn().mockResolvedValue(undefined) };
    workflowsManagementApi = {
      deleteWorkflows: jest.fn().mockResolvedValue({ failures: [] }),
    };
    improvementsClients = [];
    improvementsSpaceIds = [];
    getSpaces = jest.fn().mockResolvedValue(spacesStart);
    getAgentBuilder = jest.fn().mockResolvedValue(undefined);
    scheduleService = {
      reconcile: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    readService = { query: jest.fn(), describe: jest.fn(), list: jest.fn() };
    readServiceParams = [];

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

    const router = {
      versioned: {
        get: jest.fn(createVersionedRoute('GET')),
        post: jest.fn(createVersionedRoute('POST')),
        put: jest.fn(createVersionedRoute('PUT')),
        delete: jest.fn(createVersionedRoute('DELETE')),
      },
    } as unknown as IRouter;

    registerAiIndexRoutes({
      router,
      logger,
      getAiIndexService: () => aiIndexService as unknown as AiIndexService,
      getAiIndexDataReadService: (params) => {
        readServiceParams.push(params);
        return readService;
      },
      getImprovementsService: (esClient, spaceId) => {
        improvementsClients.push(esClient);
        improvementsSpaceIds.push(spaceId);
        return improvementsService as unknown as ImprovementsServiceApi;
      },
      getScheduleService: () => scheduleService as unknown as FeedbackAnalysisScheduleService,
      getActions: async () => actions,
      getAgentBuilder,
      getWorkflowsManagementApi: async () => workflowsManagementApi,
      getSpaces,
    });
  });

  const callRoute = async (
    method: string,
    path: string,
    request: Record<string, unknown>,
    authzResult?: Record<string, boolean>
  ) => {
    const { handler } = getRoute(method, path);
    return handler(
      createContext(),
      httpServerMock.createKibanaRequest({
        ...request,
        kibanaRequestState: {
          requestId: '123',
          requestUuid: '123e4567-e89b-12d3-a456-426614174000',
          startTime: new Date('2025-01-01T00:00:00.000Z').getTime(),
          authzResult,
        },
      }),
      response
    );
  };

  const withWorkflowDeletePrivilege = {
    [WorkflowsManagementApiActions.delete]: true,
  };

  it('returns 404 on every route when the context engine is disabled', async () => {
    featureFlagEnabled = false;

    await callRoute('POST', AI_INDEX_PATH, { body: { id: 'a' } });
    await callRoute('PUT', AI_INDEX_BY_ID_PATH, { params: { aiIndexId: 'a' }, body: {} });
    await callRoute('GET', AI_INDEX_BY_ID_PATH, { params: { aiIndexId: 'a' } });
    await callRoute('GET', AI_INDEX_KI_LIST_PATH, { params: { aiIndexId: 'a' } });
    await callRoute('GET', AI_INDEX_KI_BY_ID_PATH, {
      params: { aiIndexId: 'a', kiId: 'ki-1' },
      query: { index: kiBackingIndex },
    });
    await callRoute('GET', AI_INDEX_PATH, {});
    await callRoute('POST', AI_INDEX_QUERY_PATH, { body: { query: 'FROM ai-index-idx-a' } });
    await callRoute('GET', AI_INDEX_DESCRIBE_PATH, { params: { aiIndexId: 'a' } });
    await callRoute('DELETE', AI_INDEX_BY_ID_PATH, { params: { aiIndexId: 'a' } });
    await callRoute('PUT', AI_INDEX_FEEDBACK_ANALYSIS_PATH, {
      params: { aiIndexId: 'a' },
      body: { enabled: true },
    });

    expect(response.notFound).toHaveBeenCalledTimes(10);
    expect(aiIndexService.create).not.toHaveBeenCalled();
    expect(aiIndexService.put).not.toHaveBeenCalled();
    expect(aiIndexService.get).not.toHaveBeenCalled();
    expect(aiIndexService.delete).not.toHaveBeenCalled();
    expect(aiIndexService.setFeedbackAnalysis).not.toHaveBeenCalled();
    expect(readService.query).not.toHaveBeenCalled();
    expect(readService.describe).not.toHaveBeenCalled();
    expect(readService.list).not.toHaveBeenCalled();
  });

  it('registers routes with the expected access and privileges', () => {
    expect(getRoute('POST', AI_INDEX_PATH).config).toMatchObject({
      access: 'public',
      security: { authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] } },
    });
    expect(getRoute('PUT', AI_INDEX_BY_ID_PATH).config).toMatchObject({
      access: 'public',
      security: { authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] } },
    });
    expect(getRoute('GET', AI_INDEX_BY_ID_PATH).config).toMatchObject({
      access: 'public',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
    });
    expect(getRoute('GET', AI_INDEX_KI_LIST_PATH).config).toMatchObject({
      access: 'internal',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
    });
    expect(getRoute('GET', AI_INDEX_KI_BY_ID_PATH).config).toMatchObject({
      access: 'internal',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
    });
    expect(getRoute('GET', AI_INDEX_PATH).config).toMatchObject({
      access: 'public',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
    });
    expect(getRoute('POST', AI_INDEX_QUERY_PATH).config).toMatchObject({
      access: 'public',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
    });
    expect(getRoute('GET', AI_INDEX_DESCRIBE_PATH).config).toMatchObject({
      access: 'public',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
    });
    expect(getRoute('DELETE', AI_INDEX_BY_ID_PATH).config).toMatchObject({
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.writeContextEngine],
          extendedPrivileges: [WorkflowsManagementApiActions.delete],
        },
      },
    });
    expect(getRoute('PUT', AI_INDEX_FEEDBACK_ANALYSIS_PATH).config).toMatchObject({
      access: 'internal',
      security: { authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] } },
    });
  });

  describe('POST /api/context_engine/ai_index', () => {
    const postBody = {
      id: 'customer_support',
      dest: { type: 'data_stream', value: 'ai-index-ds-customer_support*' },
      automations: [{ type: 'workflow', value: 'nightly-refresh' }],
      sources: [{ type: 'esql', value: 'FROM ai-index-ds-customer_support | LIMIT 10' }],
      traces: [],
    };

    it('returns 201 when the AI Index is created', async () => {
      aiIndexService.create.mockResolvedValue(undefined);

      await callRoute('POST', AI_INDEX_PATH, { body: postBody });

      const { id, ...properties } = postBody;
      expect(aiIndexService.create).toHaveBeenCalledWith(
        'customer_support',
        defaultSpaceId,
        properties
      );
      expect(response.created).toHaveBeenCalledWith({ body: { status: 'created' } });
    });

    it('returns 409 when the id already exists', async () => {
      aiIndexService.create.mockRejectedValue(new AiIndexAlreadyExistsError('customer_support'));

      await callRoute('POST', AI_INDEX_PATH, { body: postBody });

      expect(response.conflict).toHaveBeenCalledWith({
        body: { message: "AI index 'customer_support' already exists" },
      });
    });

    it('returns 400 when the dest is invalid', async () => {
      aiIndexService.create.mockRejectedValue(
        new InvalidAiIndexDestError("dest.value 'customer_support*' is not allowed")
      );

      await callRoute('POST', AI_INDEX_PATH, { body: postBody });

      expect(response.badRequest).toHaveBeenCalledWith({
        body: { message: "dest.value 'customer_support*' is not allowed" },
      });
    });

    it('passes connector sources through to create once validated', async () => {
      aiIndexService.create.mockResolvedValue(undefined);
      actionsClient.getBulk.mockResolvedValue([buildConnector('connector-1', '.google_drive')]);
      const body = {
        ...postBody,
        sources: [{ type: 'connector', value: 'connector-1' }],
      };

      await callRoute('POST', AI_INDEX_PATH, { body });

      const { id, ...properties } = body;
      expect(aiIndexService.create).toHaveBeenCalledWith(
        'customer_support',
        defaultSpaceId,
        properties
      );
      expect(response.created).toHaveBeenCalledWith({ body: { status: 'created' } });
    });

    it('returns 400 without creating when a connector source is not a data connector', async () => {
      actionsClient.getBulk.mockResolvedValue([buildConnector('slack-1', '.slack')]);

      await callRoute('POST', AI_INDEX_PATH, {
        body: { ...postBody, sources: [{ type: 'connector', value: 'slack-1' }] },
      });

      expect(aiIndexService.create).not.toHaveBeenCalled();
      expect(response.badRequest).toHaveBeenCalledWith({
        body: {
          message: 'Connector [slack-1] of type [.slack] cannot be used as an AI index source',
        },
      });
    });

    it('returns 400 without creating when a connector source cannot be resolved', async () => {
      actionsClient.getBulk.mockRejectedValue(new Error('Failed to load action missing-1 (404)'));

      await callRoute('POST', AI_INDEX_PATH, {
        body: { ...postBody, sources: [{ type: 'connector', value: 'missing-1' }] },
      });

      expect(aiIndexService.create).not.toHaveBeenCalled();
      expect(response.badRequest).toHaveBeenCalledWith({
        body: { message: 'Unable to resolve connector sources: missing-1' },
      });
    });

    it('returns 400 without creating when an ES|QL source is invalid', async () => {
      await callRoute('POST', AI_INDEX_PATH, {
        body: { ...postBody, sources: [{ type: 'esql', value: 'FROM logs | WHERE' }] },
      });

      expect(aiIndexService.create).not.toHaveBeenCalled();
      expect(response.badRequest).toHaveBeenCalledWith({
        body: {
          message: expect.stringMatching(/^ES\|QL source 'FROM logs \| WHERE' is invalid: /),
        },
      });
    });

    it('does not consult the actions client when there are no connector sources', async () => {
      aiIndexService.create.mockResolvedValue(undefined);

      await callRoute('POST', AI_INDEX_PATH, { body: postBody });

      expect(actions.getActionsClientWithRequest).not.toHaveBeenCalled();
    });

    it('returns 400 without creating when an index trace does not resolve', async () => {
      esResolveIndex.mockResolvedValue({ indices: [], aliases: [], data_streams: [] });

      await callRoute('POST', AI_INDEX_PATH, {
        body: { ...postBody, traces: [{ type: 'index', value: 'missing-logs' }] },
      });

      expect(aiIndexService.create).not.toHaveBeenCalled();
      expect(response.badRequest).toHaveBeenCalledWith({
        body: {
          message: `Index trace 'missing-logs' does not match any index, data stream, or alias`,
        },
      });
    });

    it('returns 400 without creating when an agent trace is not found', async () => {
      getAgentBuilder.mockResolvedValue({
        agents: {
          getRegistry: async () => ({
            has: async () => false,
          }),
        },
      });

      await callRoute('POST', AI_INDEX_PATH, {
        body: { ...postBody, traces: [{ type: 'elastic_agent', value: 'missing-agent' }] },
      });

      expect(aiIndexService.create).not.toHaveBeenCalled();
      expect(response.badRequest).toHaveBeenCalledWith({
        body: { message: `Agent 'missing-agent' was not found` },
      });
    });
  });

  describe('PUT /api/context_engine/ai_index/{aiIndexId}', () => {
    const putRequest = {
      params: { aiIndexId: 'customer_support' },
      body: {
        dest: { type: 'data_stream', value: 'ai-index-ds-customer_support*' },
        automations: [{ type: 'workflow', value: 'nightly-refresh' }],
        sources: [{ type: 'esql', value: 'FROM ai-index-ds-customer_support | LIMIT 10' }],
        traces: [],
      },
    };

    it('returns 201 when the AI Index is created', async () => {
      aiIndexService.put.mockResolvedValue('created');

      await callRoute('PUT', AI_INDEX_BY_ID_PATH, putRequest);

      expect(aiIndexService.put).toHaveBeenCalledWith(
        'customer_support',
        defaultSpaceId,
        putRequest.body
      );
      expect(response.created).toHaveBeenCalledWith({ body: { status: 'created' } });
    });

    it('returns 200 when the AI Index is updated', async () => {
      aiIndexService.put.mockResolvedValue('updated');

      await callRoute('PUT', AI_INDEX_BY_ID_PATH, putRequest);

      expect(response.ok).toHaveBeenCalledWith({ body: { status: 'updated' } });
    });

    it('returns 400 when the dest is invalid', async () => {
      aiIndexService.put.mockRejectedValue(
        new InvalidAiIndexDestError(
          "dest.value 'customer_support*' does not match any existing index, index pattern, or data stream"
        )
      );

      await callRoute('PUT', AI_INDEX_BY_ID_PATH, putRequest);

      expect(response.badRequest).toHaveBeenCalledWith({
        body: {
          message:
            "dest.value 'customer_support*' does not match any existing index, index pattern, or data stream",
        },
      });
    });

    it('returns 409 when the AI Index is modified concurrently', async () => {
      aiIndexService.put.mockRejectedValue(new AiIndexConflictError('customer_support'));

      await callRoute('PUT', AI_INDEX_BY_ID_PATH, putRequest);

      expect(response.conflict).toHaveBeenCalledWith({
        body: { message: "AI index 'customer_support' was modified concurrently; please retry" },
      });
    });

    it('passes connector sources through to put once validated', async () => {
      aiIndexService.put.mockResolvedValue('updated');
      actionsClient.getBulk.mockResolvedValue([buildConnector('connector-1', '.notion')]);
      const body = { ...putRequest.body, sources: [{ type: 'connector', value: 'connector-1' }] };

      await callRoute('PUT', AI_INDEX_BY_ID_PATH, { ...putRequest, body });

      expect(aiIndexService.put).toHaveBeenCalledWith('customer_support', defaultSpaceId, body);
      expect(response.ok).toHaveBeenCalledWith({ body: { status: 'updated' } });
    });

    it('returns 400 without updating when an ES|QL source is invalid', async () => {
      await callRoute('PUT', AI_INDEX_BY_ID_PATH, {
        ...putRequest,
        body: { ...putRequest.body, sources: [{ type: 'esql', value: 'FROM logs | WHERE' }] },
      });

      expect(aiIndexService.put).not.toHaveBeenCalled();
      expect(response.badRequest).toHaveBeenCalledWith({
        body: {
          message: expect.stringMatching(/^ES\|QL source 'FROM logs \| WHERE' is invalid: /),
        },
      });
    });

    it('returns 400 without updating when a connector source is not a data connector', async () => {
      actionsClient.getBulk.mockResolvedValue([buildConnector('slack-1', '.slack')]);

      await callRoute('PUT', AI_INDEX_BY_ID_PATH, {
        ...putRequest,
        body: { ...putRequest.body, sources: [{ type: 'connector', value: 'slack-1' }] },
      });

      expect(aiIndexService.put).not.toHaveBeenCalled();
      expect(response.badRequest).toHaveBeenCalledWith({
        body: {
          message: 'Connector [slack-1] of type [.slack] cannot be used as an AI index source',
        },
      });
    });

    it('returns 400 without updating when an index trace does not resolve', async () => {
      esResolveIndex.mockResolvedValue({ indices: [], aliases: [], data_streams: [] });

      await callRoute('PUT', AI_INDEX_BY_ID_PATH, {
        ...putRequest,
        body: { ...putRequest.body, traces: [{ type: 'index', value: 'missing-logs' }] },
      });

      expect(aiIndexService.put).not.toHaveBeenCalled();
      expect(response.badRequest).toHaveBeenCalledWith({
        body: {
          message: `Index trace 'missing-logs' does not match any index, data stream, or alias`,
        },
      });
    });
  });

  describe('GET /api/context_engine/ai_index/{aiIndexId}', () => {
    it('returns the AI Index', async () => {
      aiIndexService.get.mockResolvedValue(aiIndexItem);

      await callRoute('GET', AI_INDEX_BY_ID_PATH, { params: { aiIndexId: 'customer_support' } });

      expect(aiIndexService.get).toHaveBeenCalledWith('customer_support', defaultSpaceId);
      expect(response.ok).toHaveBeenCalledWith({ body: aiIndexItem });
    });

    it('returns 404 when the AI Index does not exist', async () => {
      aiIndexService.get.mockRejectedValue(new AiIndexNotFoundError('missing'));

      await callRoute('GET', AI_INDEX_BY_ID_PATH, { params: { aiIndexId: 'missing' } });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: "AI index 'missing' not found" },
      });
    });

    it('returns 500 with the unexpected error message after logging it', async () => {
      const boom = new Error('boom');
      aiIndexService.get.mockRejectedValue(boom);

      await callRoute('GET', AI_INDEX_BY_ID_PATH, { params: { aiIndexId: 'customer_support' } });

      expect(logger.error).toHaveBeenCalledWith(boom.stack);
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'boom' },
      });
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({ action: 'ai_index_get', outcome: 'failure' }),
          kibana: { saved_object: { type: 'ai_index', id: 'customer_support' } },
        })
      );
    });

    it('forwards Elasticsearch status codes instead of forcing 500', async () => {
      aiIndexService.get.mockRejectedValue(
        new errors.ResponseError(
          elasticsearchClientMock.createApiResponse({
            statusCode: 429,
            body: {
              error: { type: 'es_rejected_execution_exception', reason: 'too many requests' },
            },
          })
        )
      );

      await callRoute('GET', AI_INDEX_BY_ID_PATH, { params: { aiIndexId: 'customer_support' } });

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 429,
        body: { message: 'es_rejected_execution_exception: too many requests' },
      });
    });
  });

  const createEsError = (statusCode: number, message: string) =>
    new errors.ResponseError({
      meta: {
        aborted: false,
        attempts: 1,
        connection: null,
        context: null,
        name: message,
        request: {} as unknown as DiagnosticResult['meta']['request'],
      },
      warnings: [],
      body: { error: { type: message, reason: message } },
      statusCode,
    });

  describe('POST /api/context_engine/ai_index/_query', () => {
    const queryBody = { query: 'FROM ai-index-idx-a | LIMIT 10', params: { type: 'faq' } };
    const esqlResponse = { columns: [{ name: 'title', type: 'keyword' }], values: [['Refunds']] };

    it('builds the read service from the current user client and request, then queries', async () => {
      readService.query.mockResolvedValue(esqlResponse);

      const request = httpServerMock.createKibanaRequest({ body: queryBody });
      await getRoute('POST', AI_INDEX_QUERY_PATH).handler(createContext(), request, response);

      expect(readServiceParams).toHaveLength(1);
      expect(readServiceParams[0].request).toBe(request);
      expect(readServiceParams[0].esClient).toMatchObject({ search: esSearch, get: esGet });
      expect(readService.query).toHaveBeenCalledWith(queryBody);
      expect(response.ok).toHaveBeenCalledWith({ body: esqlResponse });
    });

    it('returns 400 when the service rejects the input', async () => {
      readService.query.mockRejectedValue(new InvalidAiIndexQueryError('limit: bad'));

      await callRoute('POST', AI_INDEX_QUERY_PATH, { body: queryBody });

      expect(response.badRequest).toHaveBeenCalledWith({ body: { message: 'limit: bad' } });
    });

    it('returns 400 when the response exceeds the size cap', async () => {
      readService.query.mockRejectedValue(new AiIndexQueryResponseTooLargeError(20 * 1024 * 1024));

      await callRoute('POST', AI_INDEX_QUERY_PATH, { body: queryBody });

      expect(response.badRequest).toHaveBeenCalledWith({
        body: { message: expect.stringContaining('20MB') },
      });
    });

    it('passes Elasticsearch 4xx errors through with their status', async () => {
      readService.query.mockRejectedValue(createEsError(403, 'security_exception'));

      await callRoute('POST', AI_INDEX_QUERY_PATH, { body: queryBody });

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 403,
        body: { message: expect.stringContaining('security_exception') },
      });
    });

    it('returns Elasticsearch 5xx errors with their status code and logs them', async () => {
      const esError = createEsError(503, 'unavailable');
      readService.query.mockRejectedValue(esError);

      await callRoute('POST', AI_INDEX_QUERY_PATH, { body: queryBody });

      expect(logger.error).toHaveBeenCalledWith(esError.stack);
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: { message: 'unavailable: unavailable' },
      });
    });

    describe('body validation', () => {
      const validateBody = (body: unknown) => {
        const { validate } = getRoute('POST', AI_INDEX_QUERY_PATH);
        if (validate === false || !validate.request?.body) {
          throw new Error('expected a body schema');
        }
        return validate.request.body.validate(body);
      };

      it('accepts a full body', () => {
        expect(() =>
          validateBody({ query: 'FROM a', params: { s: 'x', n: 1, b: true }, limit: 5 })
        ).not.toThrow();
      });

      it('requires a non-empty query', () => {
        expect(() => validateBody({})).toThrow(/query/);
        expect(() => validateBody({ query: '' })).toThrow();
      });

      it('bounds the query length', () => {
        expect(() => validateBody({ query: 'a'.repeat(MAX_AI_INDEX_QUERY_LENGTH) })).not.toThrow();
        expect(() => validateBody({ query: 'a'.repeat(MAX_AI_INDEX_QUERY_LENGTH + 1) })).toThrow();
      });

      it('requires an integer limit within bounds', () => {
        expect(() => validateBody({ query: 'FROM a', limit: 1 })).not.toThrow();
        expect(() =>
          validateBody({ query: 'FROM a', limit: MAX_AI_INDEX_QUERY_LIMIT })
        ).not.toThrow();
        expect(() => validateBody({ query: 'FROM a', limit: 0 })).toThrow();
        expect(() => validateBody({ query: 'FROM a', limit: -5 })).toThrow();
        expect(() => validateBody({ query: 'FROM a', limit: 1.5 })).toThrow(/integer/);
        expect(() =>
          validateBody({ query: 'FROM a', limit: MAX_AI_INDEX_QUERY_LIMIT + 1 })
        ).toThrow();
      });

      it('bounds param count, key length, and value length', () => {
        const tooMany = Object.fromEntries(
          Array.from({ length: MAX_AI_INDEX_QUERY_PARAMS + 1 }, (_, i) => [`p${i}`, i])
        );
        expect(() => validateBody({ query: 'FROM a', params: tooMany })).toThrow(/entries/);
        expect(() =>
          validateBody({
            query: 'FROM a',
            params: { ['k'.repeat(MAX_AI_INDEX_QUERY_PARAM_KEY_LENGTH + 1)]: 1 },
          })
        ).toThrow();
        expect(() =>
          validateBody({
            query: 'FROM a',
            params: { v: 'x'.repeat(MAX_AI_INDEX_QUERY_PARAM_VALUE_LENGTH + 1) },
          })
        ).toThrow();
      });

      it('rejects non-scalar param values', () => {
        expect(() => validateBody({ query: 'FROM a', params: { v: null } })).toThrow();
        expect(() => validateBody({ query: 'FROM a', params: { v: [1] } })).toThrow();
        expect(() => validateBody({ query: 'FROM a', params: { v: { a: 1 } } })).toThrow();
      });
    });
  });

  describe('GET /api/context_engine/ai_index/{aiIndexId}/_describe', () => {
    const contextBlock = 'AI index: a\nQuery with ES|QL against: ai-index-idx-a\n\nFields\n(none)';
    const description = { response: contextBlock } satisfies DescribeAiIndexResponse;

    it('builds the read service from the current user client and request, then describes', async () => {
      readService.describe.mockResolvedValue(description);

      const request = httpServerMock.createKibanaRequest({ params: { aiIndexId: 'a' } });
      await getRoute('GET', AI_INDEX_DESCRIBE_PATH).handler(createContext(), request, response);

      expect(readServiceParams).toHaveLength(1);
      expect(readServiceParams[0].request).toBe(request);
      expect(readServiceParams[0].esClient).toMatchObject({ search: esSearch, get: esGet });
      expect(readService.describe).toHaveBeenCalledWith('a');
      expect(response.ok).toHaveBeenCalledWith({ body: description });
    });

    it('returns 404 when the AI Index does not exist', async () => {
      readService.describe.mockRejectedValue(new AiIndexNotFoundError('missing'));

      await callRoute('GET', AI_INDEX_DESCRIBE_PATH, { params: { aiIndexId: 'missing' } });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: "AI index 'missing' not found" },
      });
    });

    it('returns 403 when the caller cannot read the backing indices', async () => {
      readService.describe.mockRejectedValue(new AiIndexNotReadableError('a'));

      await callRoute('GET', AI_INDEX_DESCRIBE_PATH, { params: { aiIndexId: 'a' } });

      expect(response.forbidden).toHaveBeenCalledWith({
        body: { message: expect.stringContaining("AI index 'a' is not readable") },
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('does not report a backing index that cannot be searched as forbidden', async () => {
      readService.describe.mockRejectedValue(
        new Error("AI index 'a' is not available: index_closed_exception")
      );

      await callRoute('GET', AI_INDEX_DESCRIBE_PATH, { params: { aiIndexId: 'a' } });

      expect(response.forbidden).not.toHaveBeenCalled();
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: "AI index 'a' is not available: index_closed_exception" },
      });
    });

    it('returns 400 when the field metadata exceeds the size cap', async () => {
      readService.describe.mockRejectedValue(
        new AiIndexDescribeResponseTooLargeError(20 * 1024 * 1024)
      );

      await callRoute('GET', AI_INDEX_DESCRIBE_PATH, { params: { aiIndexId: 'a' } });

      expect(response.badRequest).toHaveBeenCalledWith({
        body: { message: expect.stringContaining('20MB') },
      });
    });

    it('passes Elasticsearch 4xx errors through with their status', async () => {
      readService.describe.mockRejectedValue(createEsError(403, 'security_exception'));

      await callRoute('GET', AI_INDEX_DESCRIBE_PATH, { params: { aiIndexId: 'a' } });

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 403,
        body: { message: expect.stringContaining('security_exception') },
      });
    });

    it('returns Elasticsearch 5xx errors with their status code and logs them', async () => {
      const esError = createEsError(503, 'unavailable');
      readService.describe.mockRejectedValue(esError);

      await callRoute('GET', AI_INDEX_DESCRIBE_PATH, { params: { aiIndexId: 'a' } });

      expect(logger.error).toHaveBeenCalledWith(esError.stack);
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: { message: 'unavailable: unavailable' },
      });
    });
  });

  describe('GET /internal/context_engine/ai_index/{aiIndexId}/kis', () => {
    const rows = (values: unknown[][]) => ({
      columns: [{ name: '_index' }, { name: 'id' }, { name: 'type' }, { name: 'title' }],
      values,
    });
    const probe = {
      columns: ['id', '@timestamp', 'type', 'title', 'governance.lifecycle.status'].map((name) => ({
        name,
      })),
      values: [],
    };
    const totals = (total: number) => ({ columns: [{ name: 'total' }], values: [[total]] });
    const buckets = (values: unknown[][]) => ({
      columns: [{ name: 'count' }, { name: 'type' }],
      values,
    });

    it('returns the current Knowledge Indicators from the destination', async () => {
      aiIndexService.get.mockResolvedValue(aiIndexItem);
      esEsqlQuery
        .mockResolvedValueOnce(probe)
        .mockResolvedValueOnce(rows([[kiBackingIndex, 'ki-1', 'playbook', 'Refund playbook']]))
        .mockResolvedValueOnce(totals(12))
        .mockResolvedValueOnce(buckets([[12, 'playbook']]));

      await callRoute('GET', AI_INDEX_KI_LIST_PATH, {
        params: { aiIndexId: 'customer_support' },
        query: { size: 25 },
      });

      expect(aiIndexService.get).toHaveBeenCalledWith('customer_support', 'default');
      expect(esEsqlQuery.mock.calls[0][0].query).toBe(
        `FROM "${aiIndexItem.dest.value}" METADATA _id, _index\n| LIMIT 0`
      );
      expect(esEsqlQuery.mock.calls[1][0].query).toContain('| LIMIT 25');
      expect(response.ok).toHaveBeenCalledWith({
        body: {
          total: 12,
          summary: {
            total: 12,
            counts_by_type: [{ type: 'playbook', count: 12 }],
          },
          kis: [
            {
              id: 'ki-1',
              index: kiBackingIndex,
              type: 'playbook',
              title: 'Refund playbook',
            },
          ],
        },
      });
    });

    it('passes type filter to Elasticsearch', async () => {
      aiIndexService.get.mockResolvedValue(aiIndexItem);
      esEsqlQuery
        .mockResolvedValueOnce(probe)
        .mockResolvedValueOnce(rows([]))
        .mockResolvedValueOnce({
          columns: [{ name: 'total' }, { name: 'filtered' }],
          values: [[0, 0]],
        })
        .mockResolvedValueOnce(buckets([]));

      await callRoute('GET', AI_INDEX_KI_LIST_PATH, {
        params: { aiIndexId: 'customer_support' },
        query: {
          size: 10,
          type: 'fact',
        },
      });

      expect(esEsqlQuery.mock.calls[1][0]).toEqual({
        query: expect.stringContaining('| WHERE type == ?type'),
        params: [{ type: 'fact' }],
      });
    });

    it('returns 404 when the AI Index does not exist', async () => {
      aiIndexService.get.mockRejectedValue(new AiIndexNotFoundError('missing'));

      await callRoute('GET', AI_INDEX_KI_LIST_PATH, {
        params: { aiIndexId: 'missing' },
      });

      expect(response.notFound).toHaveBeenCalled();
    });

    it('returns an empty list when the backing store does not exist yet', async () => {
      aiIndexService.get.mockResolvedValue(aiIndexItem);
      esEsqlQuery.mockRejectedValueOnce(
        new errors.ResponseError({
          statusCode: 400,
          body: { error: { type: 'verification_exception', reason: 'Unknown index [x]' } },
          warnings: [],
          meta: {} as never,
        })
      );

      await callRoute('GET', AI_INDEX_KI_LIST_PATH, {
        params: { aiIndexId: 'customer_support' },
        query: { size: 25 },
      });

      expect(esEsqlQuery).toHaveBeenCalledTimes(1);
      expect(response.ok).toHaveBeenCalledWith({
        body: {
          total: 0,
          summary: {
            total: 0,
            counts_by_type: [],
          },
          kis: [],
        },
      });
    });
  });

  describe('GET /internal/context_engine/ai_index/{aiIndexId}/kis/{kiId}', () => {
    it('returns the stored Knowledge Indicator document', async () => {
      aiIndexService.get.mockResolvedValue(aiIndexItem);
      esSearch.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'ki-1',
              _index: kiBackingIndex,
              _source: {
                type: 'playbook',
                title: 'Refund playbook',
                content: 'Verify the order first.',
              },
            },
          ],
        },
      });

      await callRoute('GET', AI_INDEX_KI_BY_ID_PATH, {
        params: { aiIndexId: 'customer_support', kiId: 'ki-1' },
        query: { index: kiBackingIndex },
      });

      expect(esSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          index: aiIndexItem.dest.value,
          query: {
            bool: {
              filter: [kiIdQuery('ki-1')],
            },
          },
          // A data stream dest fetches the tie window of newest revisions.
          size: 10,
        })
      );
      expect(response.ok).toHaveBeenCalledWith({
        body: {
          id: 'ki-1',
          document: {
            type: 'playbook',
            title: 'Refund playbook',
            content: 'Verify the order first.',
          },
        },
      });
    });

    it('returns 404 when the KI does not exist', async () => {
      aiIndexService.get.mockResolvedValue(aiIndexItem);
      esSearch.mockResolvedValue({
        hits: {
          hits: [],
        },
      });

      await callRoute('GET', AI_INDEX_KI_BY_ID_PATH, {
        params: { aiIndexId: 'customer_support', kiId: 'missing' },
        query: { index: kiBackingIndex },
      });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: new KiNotFoundError('customer_support', 'missing').message },
      });
    });

    it('returns 404 when the index is outside the AI Index dest', async () => {
      aiIndexService.get.mockResolvedValue(aiIndexItem);
      esSearch.mockResolvedValue({
        hits: {
          hits: [],
        },
      });

      await callRoute('GET', AI_INDEX_KI_BY_ID_PATH, {
        params: { aiIndexId: 'customer_support', kiId: 'ki-1' },
        query: { index: 'logs-*' },
      });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: new KiNotFoundError('customer_support', 'ki-1').message },
      });
    });

    it('returns 404 when the AI Index does not exist', async () => {
      aiIndexService.get.mockRejectedValue(new AiIndexNotFoundError('missing'));

      await callRoute('GET', AI_INDEX_KI_BY_ID_PATH, {
        params: { aiIndexId: 'missing', kiId: 'ki-1' },
        query: { index: kiBackingIndex },
      });

      expect(response.notFound).toHaveBeenCalled();
    });
  });

  describe('GET /api/context_engine/ai_index', () => {
    it('lists the AI Indices readable by the current user through the read service', async () => {
      const readable = [{ id: 'a' }];
      readService.list.mockResolvedValue(readable as never);
      const request = httpServerMock.createKibanaRequest();

      await getRoute('GET', AI_INDEX_PATH).handler(createContext(), request, response);

      expect(readServiceParams).toHaveLength(1);
      expect(readServiceParams[0].request).toBe(request);
      expect(readServiceParams[0].esClient).toMatchObject({ search: esSearch, get: esGet });
      expect(aiIndexService.list).not.toHaveBeenCalled();
      expect(response.ok).toHaveBeenCalledWith({ body: { ai_indices: readable } });
    });

    it('passes Elasticsearch 4xx errors through with their status', async () => {
      readService.list.mockRejectedValue(createEsError(403, 'security_exception'));

      await callRoute('GET', AI_INDEX_PATH, {});

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 403,
        body: { message: expect.stringContaining('security_exception') },
      });
    });
  });

  describe('DELETE /api/context_engine/ai_index/{aiIndexId}', () => {
    it('returns acknowledged when the AI Index is deleted', async () => {
      aiIndexService.delete.mockResolvedValue(undefined);

      await callRoute('DELETE', AI_INDEX_BY_ID_PATH, {
        params: { aiIndexId: 'customer_support' },
      });

      expect(aiIndexService.delete).toHaveBeenCalledWith('customer_support', defaultSpaceId);
      expect(response.ok).toHaveBeenCalledWith({ body: { acknowledged: true, errors: [] } });
    });

    it('returns 409 when the AI index is managed and does not delete related resources', async () => {
      aiIndexService.get.mockResolvedValue({ ...aiIndexItem, managed: true });

      await callRoute('DELETE', AI_INDEX_BY_ID_PATH, {
        params: { aiIndexId: 'customer_support' },
        query: { delete_knowledge_indicators: true, delete_automations: true },
      });

      expect(aiIndexService.delete).not.toHaveBeenCalled();
      expect(esDeleteDataStream).not.toHaveBeenCalled();
      expect(esDeleteIndex).not.toHaveBeenCalled();
      expect(workflowsManagementApi.deleteWorkflows).not.toHaveBeenCalled();
      expect(response.conflict).toHaveBeenCalledWith({
        body: { message: expect.stringContaining('managed') },
      });
    });

    it('clears the improvements for the AI Index, so they cannot resurface under a reused id', async () => {
      aiIndexService.delete.mockResolvedValue(undefined);

      await callRoute('DELETE', AI_INDEX_BY_ID_PATH, {
        params: { aiIndexId: 'customer_support' },
      });

      expect(improvementsService.deleteByAiIndex).toHaveBeenCalledWith('customer_support');
      expect(improvementsSpaceIds).toEqual([defaultSpaceId]);
    });

    it('audits the deletion even when the improvements cleanup fails afterwards', async () => {
      aiIndexService.delete.mockResolvedValue(undefined);
      improvementsService.deleteByAiIndex.mockRejectedValue(new Error('security_exception'));

      await callRoute('DELETE', AI_INDEX_BY_ID_PATH, {
        params: { aiIndexId: 'customer_support' },
      });

      // The index is gone either way, so the audit record is owed and the caller is not sent to
      // retry a delete that would now 404.
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ event: expect.objectContaining({ outcome: 'success' }) })
      );
      expect(response.ok).toHaveBeenCalledWith({ body: { acknowledged: true, errors: [] } });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('security_exception'));
    });

    it("deletes the improvements as the request's user, since the store is a user index", async () => {
      aiIndexService.delete.mockResolvedValue(undefined);

      await callRoute('DELETE', AI_INDEX_BY_ID_PATH, {
        params: { aiIndexId: 'customer_support' },
      });

      expect(improvementsClients).toEqual([expect.objectContaining({ search: esSearch })]);
    });

    it('leaves the improvements alone when the AI Index cannot be deleted', async () => {
      aiIndexService.delete.mockRejectedValue(new AiIndexNotFoundError('missing'));

      await callRoute('DELETE', AI_INDEX_BY_ID_PATH, { params: { aiIndexId: 'missing' } });

      expect(improvementsService.deleteByAiIndex).not.toHaveBeenCalled();
    });

    it('returns 404 when the AI Index does not exist', async () => {
      aiIndexService.delete.mockRejectedValue(new AiIndexNotFoundError('missing'));

      await callRoute('DELETE', AI_INDEX_BY_ID_PATH, { params: { aiIndexId: 'missing' } });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: "AI index 'missing' not found" },
      });
    });

    describe('delete_knowledge_indicators=true', () => {
      it('deletes the backing data stream and returns no errors on success', async () => {
        aiIndexService.delete.mockResolvedValue(undefined);

        await callRoute('DELETE', AI_INDEX_BY_ID_PATH, {
          params: { aiIndexId: 'customer_support' },
          query: { delete_knowledge_indicators: true },
        });

        expect(esInternalSearch).toHaveBeenCalledWith({
          index: aiIndicesIndexName,
          size: MAX_AI_INDICES,
          track_total_hits: false,
          query: {
            bool: {
              filter: [{ term: { 'dest.value': aiIndexItem.dest.value } }],
              must_not: [createAiIndexIdentityDslFilter('customer_support', defaultSpaceId)],
            },
          },
        });
        expect(esDeleteDataStream).toHaveBeenCalledWith({ name: aiIndexItem.dest.value });
        expect(response.ok).toHaveBeenCalledWith({ body: { acknowledged: true, errors: [] } });
      });

      it('excludes the deleted entry from the request space, not always default', async () => {
        const spaces = spacesMock.createStart();
        spaces.spacesService.getSpaceId.mockReturnValue(asSpaceId('marketing'));
        getSpaces.mockResolvedValue(spaces);
        aiIndexService.delete.mockResolvedValue(undefined);

        await callRoute('DELETE', AI_INDEX_BY_ID_PATH, {
          params: { aiIndexId: 'customer_support' },
          query: { delete_knowledge_indicators: true },
        });

        expect(esInternalSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            query: {
              bool: {
                filter: [{ term: { 'dest.value': aiIndexItem.dest.value } }],
                must_not: [createAiIndexIdentityDslFilter('customer_support', 'marketing')],
              },
            },
          })
        );
      });

      it('deletes the backing index when dest type is index', async () => {
        aiIndexService.get.mockResolvedValue({
          ...aiIndexItem,
          dest: { type: 'index', value: 'my-index' },
        });
        aiIndexService.delete.mockResolvedValue(undefined);

        await callRoute('DELETE', AI_INDEX_BY_ID_PATH, {
          params: { aiIndexId: 'customer_support' },
          query: { delete_knowledge_indicators: true },
        });

        expect(esDeleteIndex).toHaveBeenCalledWith({ index: 'my-index' });
        expect(response.ok).toHaveBeenCalledWith({ body: { acknowledged: true, errors: [] } });
      });

      it('skips dest delete and warns when another AI index still uses the dest', async () => {
        aiIndexService.delete.mockResolvedValue(undefined);
        esInternalSearch.mockResolvedValue({
          hits: { hits: [{ _id: 'other_space_index' }] },
        });

        await callRoute('DELETE', AI_INDEX_BY_ID_PATH, {
          params: { aiIndexId: 'customer_support' },
          query: { delete_knowledge_indicators: true },
        });

        expect(esDeleteDataStream).not.toHaveBeenCalled();
        expect(esDeleteIndex).not.toHaveBeenCalled();
        expect(response.ok).toHaveBeenCalledWith({
          body: {
            acknowledged: true,
            errors: [expect.stringContaining('other_space_index')],
          },
        });
      });

      it('returns a partial-failure error when the backing store deletion fails', async () => {
        aiIndexService.delete.mockResolvedValue(undefined);
        esDeleteDataStream.mockRejectedValue(new Error('cluster_block_exception'));

        await callRoute('DELETE', AI_INDEX_BY_ID_PATH, {
          params: { aiIndexId: 'customer_support' },
          query: { delete_knowledge_indicators: true },
        });

        expect(response.ok).toHaveBeenCalledWith({
          body: {
            acknowledged: true,
            errors: [expect.stringContaining('cluster_block_exception')],
          },
        });
      });

      it('does not call deleteDataStream when delete_knowledge_indicators is false', async () => {
        aiIndexService.delete.mockResolvedValue(undefined);

        await callRoute('DELETE', AI_INDEX_BY_ID_PATH, {
          params: { aiIndexId: 'customer_support' },
          query: { delete_knowledge_indicators: false },
        });

        expect(esDeleteDataStream).not.toHaveBeenCalled();
        expect(esInternalSearch).not.toHaveBeenCalled();
      });

      it('does not delete a dest that is an index pattern', async () => {
        aiIndexService.get.mockResolvedValue({
          ...aiIndexItem,
          dest: { type: 'data_stream', value: 'ai-index-ds-*' },
        });
        aiIndexService.delete.mockResolvedValue(undefined);

        await callRoute('DELETE', AI_INDEX_BY_ID_PATH, {
          params: { aiIndexId: 'customer_support' },
          query: { delete_knowledge_indicators: true },
        });

        expect(esDeleteDataStream).not.toHaveBeenCalled();
        expect(esDeleteIndex).not.toHaveBeenCalled();
        expect(response.ok).toHaveBeenCalledWith({
          body: {
            acknowledged: true,
            errors: [expect.stringContaining('index pattern')],
          },
        });
      });
    });

    describe('delete_automations=true', () => {
      it('deletes workflow automations and returns no errors on success', async () => {
        aiIndexService.delete.mockResolvedValue(undefined);

        await callRoute(
          'DELETE',
          AI_INDEX_BY_ID_PATH,
          {
            params: { aiIndexId: 'customer_support' },
            query: { delete_automations: true },
          },
          withWorkflowDeletePrivilege
        );

        expect(workflowsManagementApi.deleteWorkflows).toHaveBeenCalledWith(
          ['nightly-refresh'],
          'default',
          expect.anything(),
          { force: true }
        );
        expect(response.ok).toHaveBeenCalledWith({ body: { acknowledged: true, errors: [] } });
      });

      it('returns partial-failure errors for each failed workflow deletion', async () => {
        aiIndexService.delete.mockResolvedValue(undefined);
        workflowsManagementApi.deleteWorkflows.mockResolvedValue({
          failures: [{ id: 'nightly-refresh', error: 'not_found' }],
        });

        await callRoute(
          'DELETE',
          AI_INDEX_BY_ID_PATH,
          {
            params: { aiIndexId: 'customer_support' },
            query: { delete_automations: true },
          },
          withWorkflowDeletePrivilege
        );

        expect(response.ok).toHaveBeenCalledWith({
          body: {
            acknowledged: true,
            errors: [expect.stringContaining('nightly-refresh')],
          },
        });
      });

      it('returns a partial-failure error when workflowsManagementApi is unavailable', async () => {
        registerAiIndexRoutes({
          router: {
            versioned: {
              get: jest.fn(() => ({ addVersion: jest.fn() })),
              post: jest.fn(() => ({ addVersion: jest.fn() })),
              put: jest.fn(() => ({ addVersion: jest.fn() })),
              delete: jest.fn((config) => ({
                addVersion: (
                  versionConfig: RegisteredRoute['validate'],
                  handler: RequestHandler
                ) => {
                  routes[`DELETE:${config.path}`] = { config, handler, validate: versionConfig };
                },
              })),
            },
          } as unknown as IRouter,
          logger,
          getAiIndexService: () => aiIndexService as unknown as AiIndexService,
          getAiIndexDataReadService: () => readService,
          getImprovementsService: () => improvementsService as unknown as ImprovementsServiceApi,
          getScheduleService: () => scheduleService as unknown as FeedbackAnalysisScheduleService,
          getActions: async () => actions,
          getAgentBuilder,
          getWorkflowsManagementApi: async () => undefined,
          getSpaces: async () => undefined,
        });
        aiIndexService.delete.mockResolvedValue(undefined);

        await callRoute(
          'DELETE',
          AI_INDEX_BY_ID_PATH,
          {
            params: { aiIndexId: 'customer_support' },
            query: { delete_automations: true },
          },
          withWorkflowDeletePrivilege
        );

        expect(response.ok).toHaveBeenCalledWith({
          body: {
            acknowledged: true,
            errors: [expect.stringContaining('unavailable')],
          },
        });
      });

      it('skips workflow deletion when the AI index has no automations', async () => {
        aiIndexService.get.mockResolvedValue({ ...aiIndexItem, automations: [] });
        aiIndexService.delete.mockResolvedValue(undefined);

        await callRoute('DELETE', AI_INDEX_BY_ID_PATH, {
          params: { aiIndexId: 'customer_support' },
          query: { delete_automations: true },
        });

        expect(workflowsManagementApi.deleteWorkflows).not.toHaveBeenCalled();
        expect(response.ok).toHaveBeenCalledWith({ body: { acknowledged: true, errors: [] } });
      });

      it('does not call deleteWorkflows when delete_automations is false', async () => {
        aiIndexService.delete.mockResolvedValue(undefined);

        await callRoute('DELETE', AI_INDEX_BY_ID_PATH, {
          params: { aiIndexId: 'customer_support' },
          query: { delete_automations: false },
        });

        expect(workflowsManagementApi.deleteWorkflows).not.toHaveBeenCalled();
      });

      it('does not delete workflows when the caller lacks workflow delete privilege', async () => {
        aiIndexService.delete.mockResolvedValue(undefined);

        await callRoute(
          'DELETE',
          AI_INDEX_BY_ID_PATH,
          {
            params: { aiIndexId: 'customer_support' },
            query: { delete_automations: true },
          },
          { [WorkflowsManagementApiActions.delete]: false }
        );

        expect(aiIndexService.delete).toHaveBeenCalledWith('customer_support', defaultSpaceId);
        expect(workflowsManagementApi.deleteWorkflows).not.toHaveBeenCalled();
        expect(response.ok).toHaveBeenCalledWith({
          body: {
            acknowledged: true,
            errors: [expect.stringContaining('Missing privilege to delete workflow automations')],
          },
        });
        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('related resources'),
            event: expect.objectContaining({
              action: 'ai_index_delete_resources',
              outcome: 'failure',
            }),
          })
        );
      });
    });

    it('collects errors from both backing store and automations when both flags are true', async () => {
      aiIndexService.delete.mockResolvedValue(undefined);
      esDeleteDataStream.mockRejectedValue(new Error('es_error'));
      workflowsManagementApi.deleteWorkflows.mockResolvedValue({
        failures: [{ id: 'nightly-refresh', error: 'wf_error' }],
      });

      await callRoute(
        'DELETE',
        AI_INDEX_BY_ID_PATH,
        {
          params: { aiIndexId: 'customer_support' },
          query: { delete_knowledge_indicators: true, delete_automations: true },
        },
        withWorkflowDeletePrivilege
      );

      expect(response.ok).toHaveBeenCalledWith({
        body: {
          acknowledged: true,
          errors: [expect.stringContaining('es_error'), expect.stringContaining('nightly-refresh')],
        },
      });
    });
  });

  describe('space scoping', () => {
    it('resolves the space id from the spaces plugin and threads it through to the service', async () => {
      const spaces = spacesMock.createStart();
      spaces.spacesService.getSpaceId.mockReturnValue(asSpaceId('marketing'));
      getSpaces.mockResolvedValue(spaces);
      aiIndexService.get.mockResolvedValue(aiIndexItem);
      aiIndexService.delete.mockResolvedValue(undefined);

      await callRoute('GET', AI_INDEX_BY_ID_PATH, { params: { aiIndexId: 'customer_support' } });
      await callRoute('DELETE', AI_INDEX_BY_ID_PATH, { params: { aiIndexId: 'customer_support' } });

      expect(aiIndexService.get).toHaveBeenCalledWith('customer_support', 'marketing');
      expect(aiIndexService.delete).toHaveBeenCalledWith('customer_support', 'marketing');
    });
  });

  describe('PUT /internal/context_engine/ai_index/{aiIndexId}/feedback_analysis', () => {
    const feedbackAnalysis = {
      enabled: true,
      agent_id: 'my-analysis-agent',
      schedule: { interval: '24h' },
      signal_time_range: { type: 'relative' as const, from: 'now-30d' },
    };

    it('stores the configuration and returns what was stored', async () => {
      aiIndexService.setFeedbackAnalysis.mockResolvedValue(feedbackAnalysis);

      await callRoute('PUT', AI_INDEX_FEEDBACK_ANALYSIS_PATH, {
        params: { aiIndexId: 'customer_support' },
        body: feedbackAnalysis,
      });

      expect(aiIndexService.setFeedbackAnalysis).toHaveBeenCalledWith(
        'customer_support',
        defaultSpaceId,
        feedbackAnalysis
      );
      expect(response.ok).toHaveBeenCalledWith({
        body: { feedback_analysis: feedbackAnalysis },
      });
    });

    it('returns 404 when the AI Index does not exist', async () => {
      aiIndexService.setFeedbackAnalysis.mockRejectedValue(new AiIndexNotFoundError('missing'));

      await callRoute('PUT', AI_INDEX_FEEDBACK_ANALYSIS_PATH, {
        params: { aiIndexId: 'missing' },
        body: feedbackAnalysis,
      });

      expect(response.notFound).toHaveBeenCalled();
    });

    it('returns 409 when a concurrent write wins', async () => {
      aiIndexService.setFeedbackAnalysis.mockRejectedValue(
        new AiIndexConflictError('customer_support')
      );

      await callRoute('PUT', AI_INDEX_FEEDBACK_ANALYSIS_PATH, {
        params: { aiIndexId: 'customer_support' },
        body: feedbackAnalysis,
      });

      expect(response.conflict).toHaveBeenCalled();
    });
  });

  describe('feedback analysis scheduling', () => {
    const feedbackAnalysis = { enabled: true, schedule: { interval: '24h' } };

    it('schedules analysis when it is turned on', async () => {
      aiIndexService.setFeedbackAnalysis.mockResolvedValue(feedbackAnalysis);
      aiIndexService.get.mockResolvedValue({ ...aiIndexItem, feedback_analysis: feedbackAnalysis });

      await callRoute('PUT', AI_INDEX_FEEDBACK_ANALYSIS_PATH, {
        params: { aiIndexId: 'customer_support' },
        body: feedbackAnalysis,
      });

      expect(scheduleService.reconcile).toHaveBeenCalledWith({
        aiIndexId: 'customer_support',
        spaceId: defaultSpaceId,
        feedbackAnalysis,
        request: expect.anything(),
      });
    });

    it('reconciles with the caller, whose credentials the scheduled runs use', async () => {
      aiIndexService.setFeedbackAnalysis.mockResolvedValue(feedbackAnalysis);
      aiIndexService.get.mockResolvedValue({ ...aiIndexItem, feedback_analysis: feedbackAnalysis });

      await callRoute('PUT', AI_INDEX_FEEDBACK_ANALYSIS_PATH, {
        params: { aiIndexId: 'customer_support' },
        body: feedbackAnalysis,
        headers: { authorization: 'Basic whoever-turned-it-on' },
      });

      const [{ request }] = scheduleService.reconcile.mock.calls[0];
      expect(request.headers.authorization).toBe('Basic whoever-turned-it-on');
    });

    it('reconciles against the stored document, not the request body', async () => {
      const stored = { enabled: false };
      aiIndexService.setFeedbackAnalysis.mockResolvedValue(feedbackAnalysis);
      aiIndexService.get.mockResolvedValue({ ...aiIndexItem, feedback_analysis: stored });

      await callRoute('PUT', AI_INDEX_FEEDBACK_ANALYSIS_PATH, {
        params: { aiIndexId: 'customer_support' },
        body: feedbackAnalysis,
      });

      expect(scheduleService.reconcile).toHaveBeenCalledWith(
        expect.objectContaining({ feedbackAnalysis: stored, spaceId: defaultSpaceId })
      );
    });

    it('schedules analysis for an index created with it enabled', async () => {
      aiIndexService.create.mockResolvedValue(undefined);
      aiIndexService.get.mockResolvedValue({ ...aiIndexItem, feedback_analysis: feedbackAnalysis });

      await callRoute('POST', AI_INDEX_PATH, {
        body: {
          id: 'customer_support',
          dest: { type: 'data_stream', value: 'ai-index-ds-customer_support' },
          automations: [],
          sources: [],
          traces: [],
          feedback_analysis: feedbackAnalysis,
        },
      });

      expect(scheduleService.reconcile).toHaveBeenCalledWith({
        aiIndexId: 'customer_support',
        spaceId: defaultSpaceId,
        feedbackAnalysis,
        request: expect.anything(),
      });
    });

    it('reconciles after a full update, which can drop the block entirely', async () => {
      aiIndexService.put.mockResolvedValue('updated');
      aiIndexService.get.mockResolvedValue(aiIndexItem);

      await callRoute('PUT', AI_INDEX_BY_ID_PATH, {
        params: { aiIndexId: 'customer_support' },
        body: {
          dest: { type: 'data_stream', value: 'ai-index-ds-customer_support' },
          automations: [],
          sources: [],
          traces: [],
        },
      });

      expect(scheduleService.reconcile).toHaveBeenCalledWith({
        aiIndexId: 'customer_support',
        spaceId: defaultSpaceId,
        request: expect.anything(),
      });
    });

    it('keeps the configuration when the schedule cannot be reconciled', async () => {
      aiIndexService.setFeedbackAnalysis.mockResolvedValue(feedbackAnalysis);
      aiIndexService.get.mockResolvedValue({ ...aiIndexItem, feedback_analysis: feedbackAnalysis });
      scheduleService.reconcile.mockRejectedValue(new Error('workflows unavailable'));

      await callRoute('PUT', AI_INDEX_FEEDBACK_ANALYSIS_PATH, {
        params: { aiIndexId: 'customer_support' },
        body: feedbackAnalysis,
      });

      expect(response.ok).toHaveBeenCalledWith({ body: { feedback_analysis: feedbackAnalysis } });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('tears the schedule down when the AI index is deleted', async () => {
      await callRoute('DELETE', AI_INDEX_BY_ID_PATH, { params: { aiIndexId: 'customer_support' } });

      expect(scheduleService.remove).toHaveBeenCalledWith({
        aiIndexId: 'customer_support',
        spaceId: defaultSpaceId,
      });
    });

    it('still deletes the AI index when tearing down its schedule fails', async () => {
      scheduleService.remove.mockRejectedValue(new Error('workflows unavailable'));

      await callRoute('DELETE', AI_INDEX_BY_ID_PATH, { params: { aiIndexId: 'customer_support' } });

      expect(aiIndexService.delete).toHaveBeenCalledWith('customer_support', defaultSpaceId);
      expect(response.ok).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('reconciles the schedule into the request space, not always default', async () => {
      const spaces = spacesMock.createStart();
      spaces.spacesService.getSpaceId.mockReturnValue(asSpaceId('marketing'));
      getSpaces.mockResolvedValue(spaces);
      aiIndexService.setFeedbackAnalysis.mockResolvedValue(feedbackAnalysis);
      aiIndexService.get.mockResolvedValue({ ...aiIndexItem, feedback_analysis: feedbackAnalysis });
      aiIndexService.create.mockResolvedValue(undefined);
      aiIndexService.put.mockResolvedValue('updated');

      await callRoute('PUT', AI_INDEX_FEEDBACK_ANALYSIS_PATH, {
        params: { aiIndexId: 'customer_support' },
        body: feedbackAnalysis,
      });
      await callRoute('POST', AI_INDEX_PATH, {
        body: {
          id: 'customer_support',
          dest: { type: 'data_stream', value: 'ai-index-ds-customer_support' },
          automations: [],
          sources: [],
          traces: [],
          feedback_analysis: feedbackAnalysis,
        },
      });
      await callRoute('PUT', AI_INDEX_BY_ID_PATH, {
        params: { aiIndexId: 'customer_support' },
        body: {
          dest: { type: 'data_stream', value: 'ai-index-ds-customer_support' },
          automations: [],
          sources: [],
          traces: [],
          feedback_analysis: feedbackAnalysis,
        },
      });

      expect(scheduleService.reconcile).toHaveBeenCalledTimes(3);
      expect(scheduleService.reconcile).toHaveBeenCalledWith({
        aiIndexId: 'customer_support',
        spaceId: 'marketing',
        feedbackAnalysis,
        request: expect.anything(),
      });
    });

    it('removes the schedule and improvements from the request space', async () => {
      const spaces = spacesMock.createStart();
      spaces.spacesService.getSpaceId.mockReturnValue(asSpaceId('marketing'));
      getSpaces.mockResolvedValue(spaces);
      aiIndexService.delete.mockResolvedValue(undefined);

      await callRoute('DELETE', AI_INDEX_BY_ID_PATH, { params: { aiIndexId: 'customer_support' } });

      expect(scheduleService.remove).toHaveBeenCalledWith({
        aiIndexId: 'customer_support',
        spaceId: 'marketing',
      });
      expect(improvementsSpaceIds).toEqual(['marketing']);
    });
  });

  describe('feedback analysis body validation', () => {
    const validateBody = (body: unknown) => {
      const { validate } = getRoute('PUT', AI_INDEX_FEEDBACK_ANALYSIS_PATH);
      if (validate === false || !validate.request?.body) {
        throw new Error('Expected a body schema');
      }
      return validate.request.body.validate(body);
    };

    it('defaults the schedule, the signal time range, and the allowed actions', () => {
      expect(validateBody({ enabled: true })).toEqual({
        enabled: true,
        schedule: { interval: '24h' },
        signal_time_range: { type: 'relative', from: 'now-30d' },
        allowed_actions: [...IMPROVEMENT_ACTIONS],
      });
    });

    it('requires enabled', () => {
      expect(() => validateBody({})).toThrow(/enabled/);
    });

    it('rejects an interval below the floor', () => {
      expect(() => validateBody({ enabled: true, schedule: { interval: '5m' } })).toThrow(
        /at least 15 minutes/
      );
    });

    it('rejects a malformed interval', () => {
      expect(() => validateBody({ enabled: true, schedule: { interval: 'hourly' } })).toThrow(
        /positive number followed by/
      );
    });

    it('accepts an interval at the floor', () => {
      expect(
        validateBody({
          enabled: true,
          schedule: { interval: '15m' },
          signal_time_range: { type: 'relative', from: 'now-1d' },
        })
      ).toMatchObject({ schedule: { interval: '15m' } });
    });

    it('rejects a relative window shorter than the schedule interval', () => {
      expect(() =>
        validateBody({
          enabled: true,
          schedule: { interval: '24h' },
          signal_time_range: { type: 'relative', from: 'now-1h' },
        })
      ).toThrow(/must cover at least one schedule interval/);
    });

    it('accepts an absolute window regardless of the interval, being open-ended', () => {
      expect(
        validateBody({
          enabled: true,
          schedule: { interval: '24h' },
          signal_time_range: { type: 'absolute', from: '2026-01-31T00:00:00.000Z' },
        })
      ).toMatchObject({ signal_time_range: { type: 'absolute' } });
    });

    it('rejects a malformed absolute window', () => {
      expect(() =>
        validateBody({
          enabled: true,
          signal_time_range: { type: 'absolute', from: 'last tuesday' },
        })
      ).toThrow();
    });

    it('rejects a malformed relative window', () => {
      expect(() =>
        validateBody({ enabled: true, signal_time_range: { type: 'relative', from: '30d' } })
      ).toThrow();
    });

    it('accepts a KQL signal filter', () => {
      expect(
        validateBody({ enabled: true, signal_filter: 'tags: query_error and data.tool: "search"' })
      ).toMatchObject({ signal_filter: 'tags: query_error and data.tool: "search"' });
    });

    it('rejects a signal filter that is not valid KQL', () => {
      expect(() => validateBody({ enabled: true, signal_filter: 'tags: (query_error' })).toThrow(
        /valid KQL query/
      );
    });

    it('accepts a subset of the improvement actions', () => {
      expect(validateBody({ enabled: true, allowed_actions: ['add_ki', 'edit_ki'] })).toMatchObject(
        { allowed_actions: ['add_ki', 'edit_ki'] }
      );
    });

    it('accepts an empty allowed action list as observe-only', () => {
      expect(validateBody({ enabled: true, allowed_actions: [] })).toMatchObject({
        allowed_actions: [],
      });
    });

    it('rejects an action outside the taxonomy', () => {
      expect(() => validateBody({ enabled: true, allowed_actions: ['delete_index'] })).toThrow();
    });
  });

  describe('POST body validation', () => {
    const validBody = {
      id: 'customer_support',
      dest: { type: 'data_stream', value: 'ai-index-ds-customer_support' },
      automations: [{ type: 'workflow', value: 'nightly-refresh' }],
      sources: [{ type: 'esql', value: 'FROM ai-index-ds-customer_support | LIMIT 10' }],
      traces: [],
    };

    const validateBody = (body: Record<string, unknown>) => {
      const { validate } = getRoute('POST', AI_INDEX_PATH);
      if (!validate || !validate.request?.body) {
        throw new Error('expected a POST body schema');
      }
      return validate.request.body.validate(body);
    };

    it('accepts a valid body', () => {
      expect(() => validateBody(validBody)).not.toThrow();
    });

    it('rejects a missing id', () => {
      const { id, ...bodyWithoutId } = validBody;
      expect(() => validateBody(bodyWithoutId)).toThrow();
    });

    it('rejects an id with disallowed characters', () => {
      expect(() => validateBody({ ...validBody, id: 'Customer_Support' })).toThrow(
        /lowercase letters, numbers, hyphens/
      );
    });

    it('rejects a disallowed dest type', () => {
      expect(() =>
        validateBody({ ...validBody, dest: { type: 'view', value: 'ai-index-idx-foo' } })
      ).toThrow();
    });

    it('accepts a connector source', () => {
      expect(() =>
        validateBody({ ...validBody, sources: [{ type: 'connector', value: 'connector-1' }] })
      ).not.toThrow();
    });

    it('accepts a mix of ES|QL and connector sources', () => {
      expect(() =>
        validateBody({
          ...validBody,
          sources: [
            { type: 'esql', value: 'FROM ai-index-ds-customer_support | LIMIT 10' },
            { type: 'connector', value: 'connector-1' },
          ],
        })
      ).not.toThrow();
    });

    it('rejects a connector source with an empty value', () => {
      expect(() =>
        validateBody({ ...validBody, sources: [{ type: 'connector', value: '' }] })
      ).toThrow();
    });

    it('rejects a source with a disallowed type', () => {
      expect(() =>
        validateBody({ ...validBody, sources: [{ type: 'sql', value: 'SELECT 1' }] })
      ).toThrow();
    });

    it('rejects a connector source exceeding the max value length', () => {
      const value = 'x'.repeat(MAX_AI_INDEX_SOURCE_VALUE_LENGTH + 1);
      expect(() =>
        validateBody({ ...validBody, sources: [{ type: 'connector', value }] })
      ).toThrow();
    });

    it('rejects an ES|QL source with an empty value', () => {
      expect(() =>
        validateBody({ ...validBody, sources: [{ type: 'esql', value: '' }] })
      ).toThrow();
    });

    it('rejects sources exceeding the max size', () => {
      const sources = Array.from({ length: MAX_AI_INDEX_SOURCES + 1 }, (_, i) => ({
        type: 'connector',
        value: `connector-${i}`,
      }));
      expect(() => validateBody({ ...validBody, sources })).toThrow();
    });

    it('defaults traces to an empty array when omitted', () => {
      const { traces, ...bodyWithoutTraces } = validBody;
      expect(validateBody(bodyWithoutTraces)).toMatchObject({ traces: [] });
    });

    it('defaults sources to an empty array when omitted', () => {
      const { sources, ...bodyWithoutSources } = validBody;
      expect(validateBody(bodyWithoutSources)).toMatchObject({ sources: [] });
    });

    it('accepts each traces type', () => {
      expect(() =>
        validateBody({
          ...validBody,
          traces: [
            { type: 'elastic_agent', value: 'my-agent' },
            { type: 'index', value: 'logs-*' },
            { type: 'esql', value: 'FROM traces-* | LIMIT 10' },
          ],
        })
      ).not.toThrow();
    });

    it('rejects traces exceeding the max size', () => {
      const traces = Array.from({ length: MAX_AI_INDEX_TRACES + 1 }, (_, i) => ({
        type: 'index',
        value: `logs-${i}`,
      }));
      expect(() => validateBody({ ...validBody, traces })).toThrow();
    });

    it('rejects an index trace value with more than 50 comma-separated expressions', () => {
      const value = Array.from(
        { length: MAX_AI_INDEX_TRACE_INDEX_EXPRESSIONS + 1 },
        (_, i) => `logs-${i}`
      ).join(',');
      expect(() => validateBody({ ...validBody, traces: [{ type: 'index', value }] })).toThrow();
    });

    it('accepts an index trace value with exactly 50 comma-separated expressions', () => {
      const value = Array.from(
        { length: MAX_AI_INDEX_TRACE_INDEX_EXPRESSIONS },
        (_, i) => `logs-${i}`
      ).join(',');
      expect(() =>
        validateBody({ ...validBody, traces: [{ type: 'index', value }] })
      ).not.toThrow();
    });
  });

  describe('PUT body validation', () => {
    const validBody = {
      dest: { type: 'data_stream', value: 'ai-index-ds-customer_support' },
      automations: [{ type: 'workflow', value: 'nightly-refresh' }],
      sources: [{ type: 'esql', value: 'FROM ai-index-ds-customer_support | LIMIT 10' }],
      traces: [],
    };

    const validateBody = (body: Record<string, unknown>) => {
      const { validate } = getRoute('PUT', AI_INDEX_BY_ID_PATH);
      if (!validate || !validate.request?.body) {
        throw new Error('expected a PUT body schema');
      }
      return validate.request.body.validate(body);
    };

    it('accepts a valid body', () => {
      expect(() => validateBody(validBody)).not.toThrow();
    });

    it('accepts empty automations and sources arrays', () => {
      expect(() => validateBody({ ...validBody, automations: [], sources: [] })).not.toThrow();
    });

    it('rejects an automation with an empty value', () => {
      expect(() =>
        validateBody({ ...validBody, automations: [{ type: 'workflow', value: '' }] })
      ).toThrow();
    });

    it('rejects an ES|QL source with an empty value', () => {
      expect(() =>
        validateBody({ ...validBody, sources: [{ type: 'esql', value: '' }] })
      ).toThrow();
    });

    it('rejects an id in the update body', () => {
      expect(() => validateBody({ ...validBody, id: 'customer_support' })).toThrow();
    });

    it('rejects a disallowed dest type', () => {
      expect(() =>
        validateBody({ ...validBody, dest: { type: 'view', value: 'ai-index-idx-foo' } })
      ).toThrow();
    });

    it('rejects a source with a disallowed type', () => {
      expect(() =>
        validateBody({ ...validBody, sources: [{ type: 'sql', value: 'SELECT 1' }] })
      ).toThrow();
    });

    it('accepts a connector source', () => {
      expect(() =>
        validateBody({ ...validBody, sources: [{ type: 'connector', value: 'connector-1' }] })
      ).not.toThrow();
    });

    it('accepts a mix of ES|QL and connector sources', () => {
      expect(() =>
        validateBody({
          ...validBody,
          sources: [
            { type: 'esql', value: 'FROM ai-index-ds-customer_support | LIMIT 10' },
            { type: 'connector', value: 'connector-1' },
          ],
        })
      ).not.toThrow();
    });

    it('rejects a connector source with an empty value', () => {
      expect(() =>
        validateBody({ ...validBody, sources: [{ type: 'connector', value: '' }] })
      ).toThrow();
    });

    it('rejects an automation with a disallowed type', () => {
      expect(() =>
        validateBody({ ...validBody, automations: [{ type: 'cron', value: 'nightly-refresh' }] })
      ).toThrow();
    });

    it('defaults automations to an empty array when omitted', () => {
      const { automations, ...bodyWithoutAutomations } = validBody;
      expect(validateBody(bodyWithoutAutomations)).toMatchObject({ automations: [] });
    });

    it('rejects automations exceeding the max size', () => {
      const automations = Array.from({ length: 101 }, (_, i) => ({
        type: 'workflow',
        value: `workflow-${i}`,
      }));
      expect(() => validateBody({ ...validBody, automations })).toThrow();
    });

    it('rejects sources exceeding the max size', () => {
      const sources = Array.from({ length: 101 }, (_, i) => ({
        type: 'esql',
        value: `FROM index-${i}`,
      }));
      expect(() => validateBody({ ...validBody, sources })).toThrow();
    });

    it('defaults traces to an empty array when omitted', () => {
      const { traces, ...bodyWithoutTraces } = validBody;
      expect(validateBody(bodyWithoutTraces)).toMatchObject({ traces: [] });
    });

    it('defaults sources to an empty array when omitted', () => {
      const { sources, ...bodyWithoutSources } = validBody;
      expect(validateBody(bodyWithoutSources)).toMatchObject({ sources: [] });
    });

    it('rejects an index trace value with more than 50 comma-separated expressions', () => {
      const value = Array.from(
        { length: MAX_AI_INDEX_TRACE_INDEX_EXPRESSIONS + 1 },
        (_, i) => `logs-${i}`
      ).join(',');
      expect(() => validateBody({ ...validBody, traces: [{ type: 'index', value }] })).toThrow();
    });

    it('accepts an index trace value with exactly 50 comma-separated expressions', () => {
      const value = Array.from(
        { length: MAX_AI_INDEX_TRACE_INDEX_EXPRESSIONS },
        (_, i) => `logs-${i}`
      ).join(',');
      expect(() =>
        validateBody({ ...validBody, traces: [{ type: 'index', value }] })
      ).not.toThrow();
    });
  });

  describe('audit logging', () => {
    const postRequest = {
      body: {
        id: 'customer_support',
        dest: { type: 'data_stream', value: 'ai-index-ds-customer_support*' },
        automations: [],
        sources: [],
        traces: [],
      },
    };

    const putRequest = {
      params: { aiIndexId: 'customer_support' },
      body: {
        dest: { type: 'data_stream', value: 'ai-index-ds-customer_support*' },
        automations: [],
        sources: [],
        traces: [],
      },
    };

    describe('POST /api/context_engine/ai_index', () => {
      it('logs outcome:success after the create succeeds', async () => {
        aiIndexService.create.mockResolvedValue(undefined);

        await callRoute('POST', AI_INDEX_PATH, postRequest);

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({
              action: 'ai_index_create',
              type: ['creation'],
              outcome: 'success',
            }),
            kibana: { saved_object: { type: 'ai_index', id: 'customer_support' } },
          })
        );
      });

      it('logs outcome:failure on error', async () => {
        aiIndexService.create.mockRejectedValue(new AiIndexAlreadyExistsError('customer_support'));

        await callRoute('POST', AI_INDEX_PATH, postRequest);

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({
              action: 'ai_index_create',
              type: ['creation'],
              outcome: 'failure',
            }),
            kibana: { saved_object: { type: 'ai_index', id: 'customer_support' } },
          })
        );
      });

      it('logs outcome:failure when connector validation fails', async () => {
        actionsClient.getBulk.mockResolvedValue([buildConnector('slack-1', '.slack')]);

        await callRoute('POST', AI_INDEX_PATH, {
          ...postRequest,
          body: { ...postRequest.body, sources: [{ type: 'connector', value: 'slack-1' }] },
        });

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({
              action: 'ai_index_create',
              outcome: 'failure',
            }),
            kibana: { saved_object: { type: 'ai_index', id: 'customer_support' } },
          })
        );
      });
    });

    describe('PUT /api/context_engine/ai_index/{aiIndexId}', () => {
      it('logs action:ai_index_create when the index is created', async () => {
        aiIndexService.put.mockResolvedValue('created');

        await callRoute('PUT', AI_INDEX_BY_ID_PATH, putRequest);

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({
              action: 'ai_index_create',
              type: ['creation'],
              outcome: 'success',
            }),
            kibana: { saved_object: { type: 'ai_index', id: 'customer_support' } },
          })
        );
      });

      it('logs action:ai_index_update when the index is updated', async () => {
        aiIndexService.put.mockResolvedValue('updated');

        await callRoute('PUT', AI_INDEX_BY_ID_PATH, putRequest);

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({
              action: 'ai_index_update',
              type: ['change'],
              outcome: 'success',
            }),
            kibana: { saved_object: { type: 'ai_index', id: 'customer_support' } },
          })
        );
      });

      it('logs outcome:failure on error', async () => {
        aiIndexService.put.mockRejectedValue(new InvalidAiIndexDestError('bad dest'));

        await callRoute('PUT', AI_INDEX_BY_ID_PATH, putRequest);

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({
              action: 'ai_index_create_or_update',
              outcome: 'failure',
            }),
          })
        );
      });

      it('logs outcome:failure when connector validation fails', async () => {
        actionsClient.getBulk.mockResolvedValue([buildConnector('slack-1', '.slack')]);

        await callRoute('PUT', AI_INDEX_BY_ID_PATH, {
          ...putRequest,
          body: { ...putRequest.body, sources: [{ type: 'connector', value: 'slack-1' }] },
        });

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({
              action: 'ai_index_create_or_update',
              outcome: 'failure',
            }),
            kibana: { saved_object: { type: 'ai_index', id: 'customer_support' } },
          })
        );
      });
    });

    describe('GET /api/context_engine/ai_index/{aiIndexId}', () => {
      it('logs outcome:success after successful retrieval', async () => {
        aiIndexService.get.mockResolvedValue({
          id: 'customer_support',
          managed: false,
          dest: { type: 'data_stream' as const, value: 'ai-index-ds-customer_support*' },
          automations: [],
          sources: [],
          traces: [],
          date_created: '2026-07-01T00:00:00.000Z',
          date_modified: '2026-07-01T00:00:00.000Z',
        });

        await callRoute('GET', AI_INDEX_BY_ID_PATH, { params: { aiIndexId: 'customer_support' } });

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({
              action: 'ai_index_get',
              type: ['access'],
              outcome: 'success',
            }),
            kibana: { saved_object: { type: 'ai_index', id: 'customer_support' } },
          })
        );
      });

      it('logs outcome:failure on error', async () => {
        aiIndexService.get.mockRejectedValue(new AiIndexNotFoundError('missing'));

        await callRoute('GET', AI_INDEX_BY_ID_PATH, { params: { aiIndexId: 'missing' } });

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({ action: 'ai_index_get', outcome: 'failure' }),
            kibana: { saved_object: { type: 'ai_index', id: 'missing' } },
          })
        );
      });
    });

    describe('DELETE /api/context_engine/ai_index/{aiIndexId}', () => {
      it('logs outcome:success after the delete succeeds', async () => {
        aiIndexService.delete.mockResolvedValue(undefined);

        await callRoute('DELETE', AI_INDEX_BY_ID_PATH, {
          params: { aiIndexId: 'customer_support' },
        });

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({
              action: 'ai_index_delete',
              type: ['deletion'],
              outcome: 'success',
            }),
            kibana: { saved_object: { type: 'ai_index', id: 'customer_support' } },
          })
        );
      });

      it('logs outcome:failure on error', async () => {
        aiIndexService.delete.mockRejectedValue(new AiIndexNotFoundError('missing'));

        await callRoute('DELETE', AI_INDEX_BY_ID_PATH, { params: { aiIndexId: 'missing' } });

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({ action: 'ai_index_delete', outcome: 'failure' }),
          })
        );
      });
    });
  });

  describe('aiIndexId param validation', () => {
    const validateParams = (params: Record<string, unknown>) => {
      const { validate } = getRoute('PUT', AI_INDEX_BY_ID_PATH);
      if (!validate || !validate.request?.params) {
        throw new Error('expected a PUT params schema');
      }
      return validate.request.params.validate(params);
    };

    const validIds = ['customer_support', 'logs-app', 'index-123', 'a', '1', 'a_b-c'] as const;
    validIds.forEach((aiIndexId) => {
      it(`accepts a valid id ${aiIndexId}`, () => {
        expect(() => validateParams({ aiIndexId })).not.toThrow();
      });
    });

    const invalidIds = [
      'Customer_Support',
      'has space',
      'has.dot',
      'emoji😀',
      'slash/id',
      'tilde~',
      '_leading_underscore',
      '-leading-hyphen',
    ] as const;
    invalidIds.forEach((aiIndexId) => {
      it(`rejects an id with disallowed characters ${aiIndexId}`, () => {
        expect(() => validateParams({ aiIndexId })).toThrow(/lowercase letters, numbers, hyphens/);
      });
    });

    it('rejects an empty id', () => {
      expect(() => validateParams({ aiIndexId: '' })).toThrow();
    });
  });
});
