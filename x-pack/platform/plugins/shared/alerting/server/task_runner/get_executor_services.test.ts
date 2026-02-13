/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsServiceMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { TaskRunnerContext } from './types';
import { ApiKeyType } from './types';
import { getExecutorServices } from './get_executor_services';
import { RuleMonitoringService } from '../monitoring/rule_monitoring_service';
import { RuleResultService } from '../monitoring/rule_result_service';
import { RULE_SAVED_OBJECT_TYPE } from '../saved_objects';

jest.mock('../lib/get_es_request_timeout', () => ({
  getEsRequestTimeout: jest.fn().mockReturnValue(5000),
}));

jest.mock('../lib/wrap_scoped_cluster_client', () => ({
  createWrappedScopedClusterClientFactory: jest.fn().mockReturnValue({
    client: jest.fn(),
    getMetrics: jest.fn(),
  }),
}));

jest.mock('../lib/wrap_search_source_client', () => ({
  wrapSearchSourceClient: jest.fn().mockReturnValue({}),
}));

jest.mock('../lib/wrap_async_search_client', () => ({
  wrapAsyncSearchClient: jest.fn().mockReturnValue({ search: jest.fn() }),
}));

jest.mock('./lib', () => ({
  withAlertingSpan: jest.fn((_name: string, cb: () => Promise<unknown>) => cb()),
}));

const getEsRequestTimeout = jest.requireMock('../lib/get_es_request_timeout').getEsRequestTimeout;
const createWrappedScopedClusterClientFactory = jest.requireMock(
  '../lib/wrap_scoped_cluster_client'
).createWrappedScopedClusterClientFactory;
const wrapAsyncSearchClient = jest.requireMock(
  '../lib/wrap_async_search_client'
).wrapAsyncSearchClient;

describe('getExecutorServices', () => {
  const logger = loggingSystemMock.createLogger();
  const fakeRequest = httpServerMock.createKibanaRequest();
  const abortController = new AbortController();
  const ruleData = {
    name: 'test-rule',
    alertTypeId: 'testAlertType',
    id: 'rule-1',
    spaceId: 'default',
  };

  let context: TaskRunnerContext;

  const createMockContext = (
    overrides: Partial<
      Pick<
        TaskRunnerContext,
        'isServerless' | 'isUiamEnabled' | 'apiKeyType' | 'getScopedClusterClientWithApiKey'
      >
    > = {}
  ): TaskRunnerContext => {
    const elasticsearch = elasticsearchServiceMock.createStart();

    const savedObjects = savedObjectsServiceMock.createStartContract();

    const data = dataPluginMock.createStartContract();
    const dataViews = {
      dataViewsServiceFactory: jest
        .fn()
        .mockResolvedValue(dataViewPluginMocks.createStartContract()),
    };

    return {
      actionsConfigMap: { default: { max: 1000 } },
      actionsPlugin: {} as TaskRunnerContext['actionsPlugin'],
      alertsService: null,
      backfillClient: {} as TaskRunnerContext['backfillClient'],
      basePathService: {} as TaskRunnerContext['basePathService'],
      cancelAlertsOnRuleTimeout: true,
      connectorAdapterRegistry: {} as TaskRunnerContext['connectorAdapterRegistry'],
      data,
      dataViews: dataViews as unknown as TaskRunnerContext['dataViews'],
      elasticsearch,
      encryptedSavedObjectsClient: {} as TaskRunnerContext['encryptedSavedObjectsClient'],
      eventLogger: {} as TaskRunnerContext['eventLogger'],
      executionContext: {} as TaskRunnerContext['executionContext'],
      kibanaBaseUrl: undefined,
      logger,
      maintenanceWindowsService: {} as TaskRunnerContext['maintenanceWindowsService'],
      maxAlerts: 1000,
      ruleTypeRegistry: {} as TaskRunnerContext['ruleTypeRegistry'],
      rulesSettingsService: {} as TaskRunnerContext['rulesSettingsService'],
      apiKeyType: ApiKeyType.ES,
      savedObjects,
      share: {} as TaskRunnerContext['share'],
      spaceIdToNamespace: jest.fn(),
      uiSettings: uiSettingsServiceMock.createStartContract(),
      getEventLogClient: jest.fn(),
      isServerless: false,
      isUiamEnabled: false,
      ...overrides,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    context = createMockContext();
  });

  describe('returned ExecutorServices shape', () => {
    test('returns all expected executor services', () => {
      const ruleMonitoringService = new RuleMonitoringService();
      const ruleResultService = new RuleResultService();

      const result = getExecutorServices({
        context,
        fakeRequest,
        abortController,
        logger,
        ruleMonitoringService,
        ruleResultService,
        ruleData,
      });

      expect(result).toMatchObject({
        ruleMonitoringService: expect.any(Object),
        ruleResultService: expect.any(Object),
        savedObjectsClient: expect.any(Object),
        uiSettingsClient: expect.any(Object),
        wrappedScopedClusterClient: expect.any(Object),
        getDataViews: expect.any(Function),
        getWrappedSearchSourceClient: expect.any(Function),
        getAsyncSearchClient: expect.any(Function),
      });
    });

    test('calls getEsRequestTimeout with logger and ruleTaskTimeout', () => {
      getExecutorServices({
        context,
        fakeRequest,
        abortController,
        logger,
        ruleMonitoringService: new RuleMonitoringService(),
        ruleResultService: new RuleResultService(),
        ruleData,
        ruleTaskTimeout: '5m',
      });

      expect(getEsRequestTimeout).toHaveBeenCalledWith(logger, '5m');
    });

    test('calls createWrappedScopedClusterClientFactory with wrapped client options and scoped cluster client', () => {
      getExecutorServices({
        context,
        fakeRequest,
        abortController,
        logger,
        ruleMonitoringService: new RuleMonitoringService(),
        ruleResultService: new RuleResultService(),
        ruleData,
        ruleTaskTimeout: '5m',
      });

      expect(createWrappedScopedClusterClientFactory).toHaveBeenCalledWith(
        expect.objectContaining({
          rule: ruleData,
          logger,
          abortController,
          requestTimeout: 5000,
          scopedClusterClient: expect.any(Object),
        })
      );
    });

    test('calls savedObjects.getScopedClient with fakeRequest and includedHiddenTypes', () => {
      getExecutorServices({
        context,
        fakeRequest,
        abortController,
        logger,
        ruleMonitoringService: new RuleMonitoringService(),
        ruleResultService: new RuleResultService(),
        ruleData,
      });

      expect(context.savedObjects.getScopedClient).toHaveBeenCalledWith(fakeRequest, {
        includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE, 'action'],
      });
    });
  });

  describe('getAsyncSearchClient', () => {
    test('calls context.data.search.asScoped with fakeRequest', () => {
      const result = getExecutorServices({
        context,
        fakeRequest,
        abortController,
        logger,
        ruleMonitoringService: new RuleMonitoringService(),
        ruleResultService: new RuleResultService(),
        ruleData,
      });

      result.getAsyncSearchClient('esql' as Parameters<typeof result.getAsyncSearchClient>[0]);

      expect(context.data.search.asScoped).toHaveBeenCalledWith(fakeRequest);
    });

    test('calls wrapAsyncSearchClient with logger, rule, strategy, client, and abortController', () => {
      const mockSearchClient = {};
      (context.data.search.asScoped as jest.Mock).mockReturnValue(mockSearchClient);

      const result = getExecutorServices({
        context,
        fakeRequest,
        abortController,
        logger,
        ruleMonitoringService: new RuleMonitoringService(),
        ruleResultService: new RuleResultService(),
        ruleData,
      });

      result.getAsyncSearchClient('esql' as Parameters<typeof result.getAsyncSearchClient>[0]);

      expect(wrapAsyncSearchClient).toHaveBeenCalledWith({
        logger,
        rule: ruleData,
        strategy: 'esql',
        client: mockSearchClient,
        abortController,
      });
    });
  });

  describe('scoped cluster client selection', () => {
    test('uses context.elasticsearch.client.asScoped when not serverless UIAM', () => {
      getExecutorServices({
        context,
        fakeRequest,
        abortController,
        logger,
        ruleMonitoringService: new RuleMonitoringService(),
        ruleResultService: new RuleResultService(),
        ruleData,
      });

      expect(context.elasticsearch.client.asScoped).toHaveBeenCalledWith(fakeRequest);
    });

    test('uses asScoped and logs warn when serverless UIAM but uiamApiKey is not provided', () => {
      context = createMockContext({
        isServerless: true,
        isUiamEnabled: true,
        apiKeyType: ApiKeyType.UIAM,
      });

      getExecutorServices({
        context,
        fakeRequest,
        abortController,
        logger,
        ruleMonitoringService: new RuleMonitoringService(),
        ruleResultService: new RuleResultService(),
        ruleData,
        uiamApiKey: undefined,
      });

      expect(context.elasticsearch.client.asScoped).toHaveBeenCalledWith(fakeRequest);
      expect(logger.warn).toHaveBeenCalledWith(
        'UIAM API key is not provided to create scoped cluster client, falling back to regular scoped cluster client.'
      );
    });

    test('uses asScoped and logs warn when serverless UIAM but getScopedClusterClientWithApiKey is not available', () => {
      context = createMockContext({
        isServerless: true,
        isUiamEnabled: true,
        apiKeyType: ApiKeyType.UIAM,
        getScopedClusterClientWithApiKey: undefined,
      });

      const uiamApiKeyBase64 = Buffer.from('prefix:my-api-key', 'utf8').toString('base64');

      getExecutorServices({
        context,
        fakeRequest,
        abortController,
        logger,
        ruleMonitoringService: new RuleMonitoringService(),
        ruleResultService: new RuleResultService(),
        ruleData,
        uiamApiKey: uiamApiKeyBase64,
      });

      expect(context.elasticsearch.client.asScoped).toHaveBeenCalledWith(fakeRequest);
      expect(logger.warn).toHaveBeenCalledWith(
        'getScopedClusterClientWithApiKey is not available in context, falling back to regular scoped cluster client.'
      );
    });

    test('uses getScopedClusterClientWithApiKey with decoded apiKey when serverless UIAM with uiamApiKey and getScopedClusterClientWithApiKey available', () => {
      const mockClientWithApiKey = {};
      const getScopedClusterClientWithApiKey = jest.fn().mockReturnValue({});

      context = createMockContext({
        isServerless: true,
        isUiamEnabled: true,
        apiKeyType: ApiKeyType.UIAM,
        getScopedClusterClientWithApiKey,
      });

      const uiamApiKeyBase64 = Buffer.from('id:decoded-api-key', 'utf8').toString('base64');

      getExecutorServices({
        context,
        fakeRequest,
        abortController,
        logger,
        ruleMonitoringService: new RuleMonitoringService(),
        ruleResultService: new RuleResultService(),
        ruleData,
        uiamApiKey: uiamApiKeyBase64,
      });

      expect(getScopedClusterClientWithApiKey).toHaveBeenCalledWith('decoded-api-key');
      expect(context.elasticsearch.client.asScoped).not.toHaveBeenCalled();
      expect(createWrappedScopedClusterClientFactory).toHaveBeenCalledWith(
        expect.objectContaining({
          scopedClusterClient: mockClientWithApiKey,
        })
      );
    });
  });
});
