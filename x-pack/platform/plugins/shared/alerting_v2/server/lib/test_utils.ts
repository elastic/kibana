/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { RulesClient, type RuleResponse } from './rules_client';
import { LoggerService } from './services/logger_service/logger_service';
import { RulesSavedObjectService } from './services/rules_saved_object_service/rules_saved_object_service';
import { StorageService } from './services/storage_service/storage_service';
import { QueryService } from './services/query_service/query_service';

/**
 * Creates a mock Elasticsearch client.
 */
export function createMockEsClient(): jest.Mocked<ElasticsearchClient> {
  return elasticsearchServiceMock.createElasticsearchClient();
}

/**
 * Creates a mock SavedObjects client.
 */
export function createMockSavedObjectsClient(): jest.Mocked<SavedObjectsClientContract> {
  return savedObjectsClientMock.create();
}

/**
 * Creates a mock Kibana Logger.
 */
export function createMockLogger(): jest.Mocked<Logger> {
  return loggerMock.create();
}

/**
 * Creates a mock scoped search client for QueryService.
 */
export function createMockSearchClient(): jest.Mocked<IScopedSearchClient> {
  // @ts-expect-error - dataPluginMock is not typed correctly
  return dataPluginMock
    .createStartContract()
    .search.asScoped(httpServerMock.createKibanaRequest({}));
}

/**
 * Creates a LoggerService with a mocked Logger.
 */
export function createLoggerService(): {
  loggerService: LoggerService;
  mockLogger: jest.Mocked<Logger>;
} {
  const mockLogger = createMockLogger();
  const loggerService = new LoggerService(mockLogger);
  return { loggerService, mockLogger };
}

/**
 * Creates a standard RuleResponse for testing.
 */
export function createRuleResponse(overrides: Partial<RuleResponse> = {}): RuleResponse {
  return {
    id: 'rule-1',
    name: 'test-rule',
    tags: [],
    schedule: { custom: '1m' },
    enabled: true,
    query: 'FROM logs-* | LIMIT 10',
    timeField: '@timestamp',
    lookbackWindow: '5m',
    groupingKey: [],
    createdBy: 'elastic',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedBy: 'elastic',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Creates a RulesSavedObjectService with a mocked SavedObjects client.
 */
export function createRulesSavedObjectService(): {
  rulesSavedObjectService: RulesSavedObjectService;
  mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
} {
  const mockSavedObjectsClient = createMockSavedObjectsClient();
  const mockSavedObjectsClientFactory = jest.fn().mockReturnValue(mockSavedObjectsClient);
  const mockSpaces = spacesMock.createStart();

  const rulesSavedObjectService = new RulesSavedObjectService(
    mockSavedObjectsClientFactory,
    mockSpaces
  );

  return { rulesSavedObjectService, mockSavedObjectsClient };
}

/**
 * Creates a RulesClient with mocked dependencies.
 * Uses a RulesSavedObjectService with a mocked SavedObjects client.
 */
export function createRulesClient(): {
  rulesClient: RulesClient;
  mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
} {
  const { rulesSavedObjectService, mockSavedObjectsClient } = createRulesSavedObjectService();
  const request = httpServerMock.createKibanaRequest();
  const http = httpServiceMock.createStartContract();
  const taskManager = taskManagerMock.createStart();
  const security = securityMock.createStart();

  http.basePath.get.mockReturnValue('/s/default');

  security.authc.getCurrentUser.mockReturnValue(
    mockAuthenticatedUser({ username: 'elastic', profile_uid: 'elastic_profile_uid' })
  );

  const rulesClient = new RulesClient(
    request,
    http,
    rulesSavedObjectService,
    taskManager,
    security
  );

  return { rulesClient, mockSavedObjectsClient };
}

/**
 * Creates a StorageService with a mocked Elasticsearch client.
 */
export function createStorageService(): {
  storageService: StorageService;
  mockEsClient: jest.Mocked<ElasticsearchClient>;
  mockLogger: jest.Mocked<Logger>;
} {
  const mockEsClient = createMockEsClient();
  const { loggerService, mockLogger } = createLoggerService();
  const storageService = new StorageService(mockEsClient, loggerService);
  return { storageService, mockEsClient, mockLogger };
}

/**
 * Creates a QueryService with a mocked search client.
 */
export function createQueryService(): {
  queryService: QueryService;
  mockSearchClient: jest.Mocked<IScopedSearchClient>;
  mockLogger: jest.Mocked<Logger>;
} {
  const mockSearchClient = createMockSearchClient();
  const { loggerService, mockLogger } = createLoggerService();
  const queryService = new QueryService(mockSearchClient, loggerService);
  return { queryService, mockSearchClient, mockLogger };
}
