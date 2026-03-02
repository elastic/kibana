/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { KibanaRequest } from '@kbn/core/server';
import { getExecutorServices } from './get_executor_services';
import type { TaskRunnerContext } from './types';
import { ruleMonitoringServiceMock } from '../monitoring/rule_monitoring_service.mock';
import { ruleResultServiceMock } from '../monitoring/rule_result_service.mock';
import type { SpaceNPRERouting } from '@kbn/core-elasticsearch-server';
import { ESQL_ASYNC_SEARCH_STRATEGY } from '@kbn/data-plugin/common';

jest.mock('../lib/wrap_scoped_cluster_client', () => ({
  createWrappedScopedClusterClientFactory: jest.fn().mockReturnValue({}),
}));

jest.mock('../lib/wrap_search_source_client', () => ({
  wrapSearchSourceClient: jest.fn().mockResolvedValue({}),
}));

jest.mock('../lib/wrap_async_search_client', () => ({
  wrapAsyncSearchClient: jest.fn().mockReturnValue({ search: jest.fn(), getMetrics: jest.fn() }),
}));

const projectRouting: SpaceNPRERouting = { projectRouting: 'space' };

function createMockContext(): jest.Mocked<TaskRunnerContext> {
  const elasticsearch = elasticsearchServiceMock.createInternalStart();
  const dataPlugin = dataPluginMock.createStartContract();
  const asScopedDataSearch = jest.fn().mockReturnValue({ search: jest.fn() });
  const asScopedSearchSource = jest.fn().mockResolvedValue({});
  const searchMock = dataPlugin.search as unknown as {
    asScoped: jest.Mock;
    searchSource: { asScoped: jest.Mock };
  };
  searchMock.asScoped = asScopedDataSearch;
  searchMock.searchSource = { asScoped: asScopedSearchSource };

  return {
    elasticsearch,
    data: dataPlugin,
    savedObjects: savedObjectsServiceMock.createInternalStartContract(),
    uiSettings: uiSettingsServiceMock.createStartContract(),
    dataViews: {
      dataViewsServiceFactory: jest.fn().mockResolvedValue({}),
      getScriptedFieldsEnabled: jest.fn().mockReturnValue(true),
    } as TaskRunnerContext['dataViews'],
  } as unknown as jest.Mocked<TaskRunnerContext>;
}

function createFakeRequest(): KibanaRequest {
  return {
    url: new URL('https://kibana.example/s/default/app/management'),
    headers: {},
    route: { path: '/', method: 'get', options: {} },
    isFakeRequest: true,
  } as unknown as KibanaRequest;
}

describe('getExecutorServices', () => {
  const logger = loggingSystemMock.createLogger();
  const abortController = new AbortController();
  const ruleData = {
    name: 'test-rule',
    alertTypeId: 'test.type',
    id: 'rule-id',
    spaceId: 'default',
  };
  const ruleMonitoringService = ruleMonitoringServiceMock.create();
  const ruleResultService = ruleResultServiceMock.create();
  (ruleMonitoringService.getLastRunMetricsSetters as jest.Mock).mockReturnValue({});
  (ruleResultService.getLastRunSetters as jest.Mock).mockReturnValue({});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('projectRouting', () => {
    it('calls elasticsearch.client.asScoped with fakeRequest and projectRouting', () => {
      const context = createMockContext();
      const fakeRequest = createFakeRequest();

      getExecutorServices({
        context,
        fakeRequest,
        abortController,
        logger,
        ruleMonitoringService,
        ruleResultService,
        ruleData,
      });

      expect(context.elasticsearch.client.asScoped).toHaveBeenCalledTimes(1);
      expect(context.elasticsearch.client.asScoped).toHaveBeenCalledWith(
        fakeRequest,
        projectRouting
      );
    });

    it('calls data.search.searchSource.asScoped with fakeRequest and projectRouting', async () => {
      const context = createMockContext();
      const fakeRequest = createFakeRequest();
      const searchSourceAsScoped = (
        context.data.search as unknown as { searchSource: { asScoped: jest.Mock } }
      ).searchSource.asScoped;

      const executorServices = getExecutorServices({
        context,
        fakeRequest,
        abortController,
        logger,
        ruleMonitoringService,
        ruleResultService,
        ruleData,
      });

      await executorServices.getWrappedSearchSourceClient();

      expect(searchSourceAsScoped).toHaveBeenCalledTimes(1);
      expect(searchSourceAsScoped).toHaveBeenCalledWith(fakeRequest, projectRouting);
    });

    it('calls data.search.asScoped with fakeRequest and projectRouting', () => {
      const context = createMockContext();
      const fakeRequest = createFakeRequest();
      const dataSearchAsScoped = (context.data.search as unknown as { asScoped: jest.Mock })
        .asScoped;

      const executorServices = getExecutorServices({
        context,
        fakeRequest,
        abortController,
        logger,
        ruleMonitoringService,
        ruleResultService,
        ruleData,
      });

      executorServices.getAsyncSearchClient(ESQL_ASYNC_SEARCH_STRATEGY);

      expect(dataSearchAsScoped).toHaveBeenCalledTimes(1);
      expect(dataSearchAsScoped).toHaveBeenCalledWith(fakeRequest, projectRouting);
    });
  });
});
