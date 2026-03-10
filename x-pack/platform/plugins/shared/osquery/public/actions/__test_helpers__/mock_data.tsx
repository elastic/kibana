/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { EuiProvider } from '@elastic/eui';

import type { SearchHit } from '../../../common/search_strategy';

export const defaultPermissions = {
  writeLiveQueries: true,
  runSavedQueries: true,
  readPacks: true,
  writePacks: false,
  readSavedQueries: true,
  writeSavedQueries: false,
};

export const noRunPermissions = {
  ...defaultPermissions,
  writeLiveQueries: false,
  runSavedQueries: false,
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

export const TestProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiProvider>
    <IntlProvider locale="en">
      <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
    </IntlProvider>
  </EuiProvider>
);

const createMockCounter = () => {
  let value = 0;

  return {
    next: () => ++value,
    reset: () => {
      value = 0;
    },
  };
};

const mockCounter = createMockCounter();

export const createMockSearchHit = (overrides?: Partial<SearchHit>): SearchHit => {
  const counter = mockCounter.next();
  const actionId = `action-${counter}`;
  const { _source, fields, ...rest } = overrides ?? {};

  return {
    _id: actionId,
    _index: '.fleet-actions',
    _source: {
      action_id: actionId,
      queries: [{ query: 'SELECT * FROM uptime', action_id: actionId, id: 'q1' }],
      agent_ids: ['agent-1', 'agent-2'],
      agent_all: false,
      agent_platforms: [],
      agent_policy_ids: [],
      ...(_source as Record<string, unknown>),
    },
    fields: {
      action_id: [actionId],
      agents: ['agent-1', 'agent-2'],
      user_id: ['elastic'],
      '@timestamp': ['2025-06-15T10:00:00.000Z'],
      ...(fields as Record<string, unknown>),
    },
    ...rest,
  } as SearchHit;
};

export const createMockPackSearchHit = (overrides?: Partial<SearchHit>): SearchHit => {
  const counter = mockCounter.next();
  const actionId = `pack-action-${counter}`;
  const { _source, fields, ...rest } = overrides ?? {};

  return {
    _id: actionId,
    _index: '.fleet-actions',
    _source: {
      action_id: actionId,
      pack_id: 'pack-1',
      pack_name: 'My Pack',
      queries: [
        { query: 'SELECT * FROM uptime', action_id: actionId, id: 'q1' },
        { query: 'SELECT * FROM os_version', action_id: actionId, id: 'q2' },
      ],
      agent_ids: ['agent-1', 'agent-2', 'agent-3'],
      agent_all: false,
      agent_platforms: [],
      agent_policy_ids: [],
      ...(_source as Record<string, unknown>),
    },
    fields: {
      action_id: [actionId],
      agents: ['agent-1', 'agent-2', 'agent-3'],
      user_id: ['admin'],
      pack_id: ['pack-1'],
      '@timestamp': ['2025-06-15T11:00:00.000Z'],
      ...(fields as Record<string, unknown>),
    },
    ...rest,
  } as SearchHit;
};

export const createMockSearchHitWithResultCounts = (overrides?: Partial<SearchHit>): SearchHit =>
  createMockSearchHit({
    ...overrides,
    _source: {
      result_counts: {
        total_rows: 42,
        responded_agents: 2,
        successful_agents: 2,
        error_agents: 0,
      },
      ...(overrides?._source as Record<string, unknown>),
    },
  });

export const createMockPackSearchHitWithResultCounts = (
  overrides?: Partial<SearchHit>
): SearchHit =>
  createMockPackSearchHit({
    ...overrides,
    _source: {
      result_counts: {
        total_rows: 100,
        queries_with_results: 3,
        queries_total: 5,
        successful_agents: 3,
        error_agents: 1,
      },
      ...(overrides?._source as Record<string, unknown>),
    },
  });

export const resetMockCounter = () => {
  mockCounter.reset();
};
