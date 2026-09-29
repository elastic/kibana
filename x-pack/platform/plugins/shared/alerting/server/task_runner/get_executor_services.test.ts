/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { KibanaRequest } from '@kbn/core/server';
import { getExecutorServices } from './get_executor_services';
import { resolveCpsData } from './resolve_cps_data';
import type { TaskRunnerContext } from './types';
import { ruleMonitoringServiceMock } from '../monitoring/rule_monitoring_service.mock';
import { ruleResultServiceMock } from '../monitoring/rule_result_service.mock';
import type { AsScopedOptions } from '@kbn/core-elasticsearch-server';
import { ESQL_ASYNC_SEARCH_STRATEGY } from '@kbn/data-plugin/common';

vi.mock('../lib/wrap_scoped_cluster_client', () => {
      const mocked = {
      createWrappedScopedClusterClientFactory: vi.fn().mockReturnValue({}),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../lib/wrap_search_source_client', () => {
      const mocked = {
      wrapSearchSourceClient: vi.fn().mockResolvedValue({}),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../lib/wrap_async_search_client', () => {
      const mocked = {
      wrapAsyncSearchClient: vi.fn().mockReturnValue({ search: vi.fn(), getMetrics: vi.fn() }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./resolve_cps_data', () => {
      const mocked = {
      resolveCpsData: vi.fn().mockResolvedValue({ linkedProjects: [] }),
    };
      return { ...mocked, default: mocked };
    });

const projectRouting: AsScopedOptions = { projectRouting: 'space' };

function createMockContext(): Mocked<TaskRunnerContext> {
  const elasticsearch = elasticsearchServiceMock.createInternalStart();
  const dataPlugin = dataPluginMock.createStartContract();
  const asScopedDataSearch = vi.fn().mockReturnValue({ search: vi.fn() });
  const asScopedSearchSource = vi.fn().mockResolvedValue({});
  const searchMock = dataPlugin.search as unknown as {
    asScoped: Mock;
    searchSource: { asScoped: Mock };
  };
  searchMock.asScoped = asScopedDataSearch;
  searchMock.searchSource = { asScoped: asScopedSearchSource };

  return {
    elasticsearch,
    data: dataPlugin,
    savedObjects: savedObjectsServiceMock.createInternalStartContract(),
    uiSettings: uiSettingsServiceMock.createStartContract(),
    dataViews: {
      dataViewsServiceFactory: vi.fn().mockResolvedValue({}),
      getScriptedFieldsEnabled: vi.fn().mockReturnValue(true),
    } as TaskRunnerContext['dataViews'],
  } as unknown as Mocked<TaskRunnerContext>;
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
  (ruleMonitoringService.getSetters as Mock).mockReturnValue({});
  (ruleResultService.getLastRunSetters as Mock).mockReturnValue({});

  beforeEach(() => {
    vi.clearAllMocks();
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
        context.data.search as unknown as { searchSource: { asScoped: Mock } }
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
      const dataSearchAsScoped = (context.data.search as unknown as { asScoped: Mock })
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

  describe('getDataViews', () => {
    it('creates the data views service with the current-user ES client for CPS fan-out', async () => {
      const context = createMockContext();
      const fakeRequest = createFakeRequest();

      const executorServices = getExecutorServices({
        context,
        fakeRequest,
        abortController,
        logger,
        ruleMonitoringService,
        ruleResultService,
        ruleData,
      });

      await executorServices.getDataViews();

      const scopedClusterClient = (context.elasticsearch.client.asScoped as Mock).mock
        .results[0].value;
      expect(context.dataViews.dataViewsServiceFactory).toHaveBeenCalledWith(
        expect.anything(),
        scopedClusterClient.asCurrentUser
      );
    });
  });

  describe('getCpsData', () => {
    it('resolves CPS data with the internal user (routing expression) and current user (linked projects)', async () => {
      const context = createMockContext();
      const fakeRequest = createFakeRequest();

      const executorServices = getExecutorServices({
        context,
        fakeRequest,
        abortController,
        logger,
        ruleMonitoringService,
        ruleResultService,
        ruleData,
      });

      await executorServices.getCpsData();

      const scopedClusterClient = (context.elasticsearch.client.asScoped as Mock).mock
        .results[0].value;
      expect(resolveCpsData).toHaveBeenCalledWith(
        scopedClusterClient.asInternalUser,
        scopedClusterClient.asCurrentUser,
        ruleData.spaceId,
        logger
      );
    });
  });
});
