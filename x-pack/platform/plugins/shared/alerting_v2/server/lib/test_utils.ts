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
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { RuleResponse } from './rules_client';

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
