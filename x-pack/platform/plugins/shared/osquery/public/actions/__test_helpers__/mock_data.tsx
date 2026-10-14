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

import type {
  LiveHistoryRow,
  ScheduledHistoryRow,
  UnifiedHistoryResponse,
} from '../../../common/api/unified_history/types';

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

export const resetMockCounter = () => {
  mockCounter.reset();
};

export const createMockLiveRow = (overrides?: Partial<LiveHistoryRow>): LiveHistoryRow => {
  const counter = mockCounter.next();
  const actionId = `action-${counter}`;

  return {
    id: actionId,
    sourceType: 'live',
    source: 'Live',
    timestamp: '2025-06-15T10:00:00.000Z',
    queryText: 'SELECT * FROM uptime',
    agentCount: 2,
    successCount: 2,
    errorCount: 0,
    totalRows: 42,
    actionId,
    userId: 'elastic',
    userProfileUid: 'profile-1',
    agentIds: ['agent-1', 'agent-2'],
    agentAll: false,
    agentPlatforms: [],
    agentPolicyIds: [],
    ...overrides,
  };
};

export const createMockPackLiveRow = (overrides?: Partial<LiveHistoryRow>): LiveHistoryRow => {
  const counter = mockCounter.next();
  const actionId = `pack-action-${counter}`;

  return {
    id: actionId,
    sourceType: 'live',
    source: 'Live',
    timestamp: '2025-06-15T11:00:00.000Z',
    queryText: '',
    queryName: undefined,
    packName: 'My Pack',
    packId: 'pack-1',
    agentCount: 3,
    successCount: 3,
    errorCount: 1,
    totalRows: 100,
    queriesWithResults: 3,
    queriesTotal: 5,
    actionId,
    userId: 'admin',
    userProfileUid: 'profile-2',
    agentIds: ['agent-1', 'agent-2', 'agent-3'],
    agentAll: false,
    agentPlatforms: [],
    agentPolicyIds: [],
    ...overrides,
  };
};

export const createMockRuleRow = (overrides?: Partial<LiveHistoryRow>): LiveHistoryRow =>
  createMockLiveRow({ source: 'Rule', userId: undefined, userProfileUid: undefined, ...overrides });

export const createMockScheduledRow = (
  overrides?: Partial<ScheduledHistoryRow>
): ScheduledHistoryRow => {
  const counter = mockCounter.next();
  const scheduleId = `schedule-${counter}`;

  return {
    id: `${scheduleId}_1`,
    sourceType: 'scheduled',
    source: 'Scheduled',
    timestamp: '2025-06-15T12:00:00.000Z',
    queryText: 'SELECT * FROM os_version',
    queryName: 'os_version_query',
    packName: 'Monitoring Pack',
    packId: 'pack-m1',
    agentCount: 5,
    successCount: 4,
    errorCount: 1,
    totalRows: 20,
    scheduleId,
    executionCount: 1,
    plannedTime: '2025-06-15T12:00:00.000Z',
    ...overrides,
  };
};

export const createMockUnifiedHistoryResponse = (
  overrides?: Partial<UnifiedHistoryResponse>
): UnifiedHistoryResponse => ({
  data: [],
  hasMore: false,
  ...overrides,
});
