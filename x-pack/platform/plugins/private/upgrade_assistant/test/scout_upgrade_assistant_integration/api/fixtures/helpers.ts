/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, CookieHeader, EsClient } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS, USAGE_COUNTERS_SAVED_OBJECT_INDEX } from './constants';

export interface DomainDeprecation {
  deprecationType: string;
  domainId?: string;
  apiId?: string;
  title?: string;
  level?: string;
  correctiveActions?: {
    mark_as_resolved_api?: Record<string, unknown>;
  };
}

export interface UsageCounter {
  domainId: string;
  counterName: string;
  counterType: string;
  source: string;
  count: number;
}

const sortUsageCounters = (first: UsageCounter, second: UsageCounter) =>
  first.counterType.localeCompare(second.counterType) ||
  first.counterName.localeCompare(second.counterName);

export const getApiDeprecations = (allDeprecations: DomainDeprecation[]) =>
  allDeprecations
    .filter((deprecation) => deprecation.deprecationType === 'api')
    .sort((first, second) => (first.title ?? '').localeCompare(second.title ?? ''));

export const getDeprecations = async (apiClient: ApiClientFixture, cookieHeader: CookieHeader) => {
  const response = await apiClient.get('api/deprecations/', {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
  });

  expect(response).toHaveStatusCode(200);

  return getApiDeprecations(response.body.deprecations as DomainDeprecation[]);
};

export const getDeprecationsCounters = async (esClient: EsClient): Promise<UsageCounter[]> => {
  const should = ['total', 'resolved', 'marked_as_resolved'].map((type) => ({
    match: { 'usage-counter.counterType': `deprecated_api_call:${type}` },
  }));

  const { hits } = await esClient.search<{ 'usage-counter': UsageCounter }>({
    index: USAGE_COUNTERS_SAVED_OBJECT_INDEX,
    query: { bool: { should } },
  });

  return hits.hits.map((hit) => hit._source!['usage-counter']).sort(sortUsageCounters);
};

export const cleanKibanaSavedObjects = async (esClient: EsClient) => {
  await esClient.deleteByQuery({
    index: '.kibana*',
    conflicts: 'proceed',
    refresh: true,
    query: {
      match_all: {},
    },
  });
};

export const expectedSuiteUsageCounters: UsageCounter[] = [
  {
    domainId: 'core',
    counterName: 'unversioned|get|/api/routing_example/d/removed_route',
    counterType: 'deprecated_api_call:marked_as_resolved',
    source: 'server',
    count: 1,
  },
  {
    domainId: 'core',
    counterName: 'unversioned|get|/api/routing_example/d/removed_route',
    counterType: 'deprecated_api_call:resolved',
    source: 'server',
    count: 1,
  },
  {
    domainId: 'core',
    counterName: '1|get|/internal/routing_example/d/internal_versioned_route',
    counterType: 'deprecated_api_call:total',
    source: 'server',
    count: 1,
  },
  {
    domainId: 'core',
    counterName: 'unversioned|get|/api/routing_example/d/removed_route',
    counterType: 'deprecated_api_call:total',
    source: 'server',
    count: 2,
  },
];
