/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import type { RuleResponse } from './rules_client';
import type { RuleSavedObjectAttributes } from '../saved_objects';

/**
 * Creates a mock Elasticsearch client.
 */
export function createMockEsClient(): DeeplyMockedApi<ElasticsearchClient> {
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
 * Creates a standard RuleResponse for testing.
 */
export function createRuleResponse(overrides: Partial<RuleResponse> = {}): RuleResponse {
  return {
    id: 'rule-1',
    kind: 'alert',
    metadata: { name: 'test-rule', time_field: '@timestamp' },
    schedule: { every: '1m', lookback: '5m' },
    evaluation: {
      query: {
        base: 'FROM logs-* | LIMIT 10',
        trigger: { condition: 'WHERE true' },
      },
    },
    grouping: { fields: [] },
    enabled: true,
    createdBy: 'elastic_profile_uid',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedBy: 'elastic_profile_uid',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Creates standard RuleSavedObjectAttributes for testing.
 */
export function createRuleSoAttributes(
  overrides: Partial<RuleSavedObjectAttributes> = {}
): RuleSavedObjectAttributes {
  return {
    kind: 'alert',
    metadata: { name: 'test-rule', time_field: '@timestamp' },
    schedule: { every: '1m', lookback: '5m' },
    evaluation: {
      query: {
        base: 'FROM logs-* | LIMIT 10',
        trigger: { condition: 'WHERE true' },
      },
    },
    grouping: { fields: [] },
    enabled: true,
    createdBy: 'elastic_profile_uid',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedBy: 'elastic_profile_uid',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}
