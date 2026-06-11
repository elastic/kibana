/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import type { QueryLink } from '@kbn/streams-schema';
import type { StreamsPluginStartDependencies } from '../../../types';
import { runSignificantEventsV2Migration } from './run_significant_events_v2_migration';
import { SigEventsV2MigrationStateStore } from './migration_state';

jest.mock('../../streams/ki/knowledge_indicator_service');
jest.mock('../../streams/ki/knowledge_indicator_client/rules/v2_rules_adapter');
jest.mock('../../streams/ki/knowledge_indicator_client/rules/v1_rules_adapter');
jest.mock('./migration_state');
jest.mock('../helpers/get_sig_events_tuning_config', () => ({
  getSigEventsTuningConfig: jest.fn().mockResolvedValue({}),
}));
jest.mock('../significant_events_alerting_v2', () => ({
  isSignificantEventsAlertingV2Active: jest.fn(),
  readSignificantEventsAlertingV2UiEnabled: jest.fn(),
  logAlertingV2PluginUnavailable: jest.fn(),
}));

import { KnowledgeIndicatorService } from '../../streams/ki/knowledge_indicator_service';
import { V2RulesAdapter } from '../../streams/ki/knowledge_indicator_client/rules/v2_rules_adapter';
import { V1RulesAdapter } from '../../streams/ki/knowledge_indicator_client/rules/v1_rules_adapter';
import {
  isSignificantEventsAlertingV2Active,
  readSignificantEventsAlertingV2UiEnabled,
} from '../significant_events_alerting_v2';

const MockedKnowledgeIndicatorService = KnowledgeIndicatorService as jest.MockedClass<
  typeof KnowledgeIndicatorService
>;
const MockedV2RulesAdapter = V2RulesAdapter as jest.MockedClass<typeof V2RulesAdapter>;
const MockedV1RulesAdapter = V1RulesAdapter as jest.MockedClass<typeof V1RulesAdapter>;
const MockedStateStore = SigEventsV2MigrationStateStore as jest.MockedClass<
  typeof SigEventsV2MigrationStateStore
>;

const makeQueryLink = (id: string): QueryLink =>
  ({
    'asset.uuid': `uuid-${id}`,
    'asset.type': 'query',
    'asset.id': id,
    query: {
      id,
      type: 'match',
      title: 'Test',
      description: 'desc',
      esql: { query: 'FROM logs' },
      severity_score: 60,
    },
    stream_name: 'logs.test',
    rule_backed: true,
    rule_id: `rule-${id}`,
  } as QueryLink);

function makeDeps({
  sigEventsEnabled = true,
  v2Active = true,
  ruleBackedLinks = [makeQueryLink('q1')],
  existingState = { status: 'not_started' as const, migrated_count: 0, failed_queries: [] },
}: {
  sigEventsEnabled?: boolean;
  v2Active?: boolean;
  ruleBackedLinks?: QueryLink[];
  existingState?: {
    status: 'not_started' | 'in_progress' | 'completed' | 'failed';
    migrated_count: number;
    failed_queries: [];
    completed_at?: string;
    last_run_at?: string;
  };
} = {}) {
  const logger = {
    get: jest.fn().mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  } as unknown as Logger;

  const uiSettingsClient = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'observability:streamsEnableSignificantEvents') {
        return Promise.resolve(sigEventsEnabled);
      }
      return Promise.resolve(undefined);
    }),
  };

  const coreStart = {
    savedObjects: {
      getUnsafeInternalClient: jest.fn().mockReturnValue({}),
    },
    uiSettings: {
      asScopedToClient: jest.fn().mockReturnValue(uiSettingsClient),
      globalAsScopedToClient: jest.fn().mockReturnValue(uiSettingsClient),
    },
    elasticsearch: {
      client: { asInternalUser: {} },
    },
  } as unknown as CoreStart;

  const v2RulesClient = {};
  const v1RulesClient = {};
  const pluginsStart = {
    alertingVTwo: {
      getRulesClientWithRequestInSpace: jest.fn().mockResolvedValue(v2RulesClient),
    },
    alerting: {
      getRulesClientWithRequestInSpace: jest.fn().mockResolvedValue(v1RulesClient),
    },
  } as unknown as StreamsPluginStartDependencies;

  const kiClient = {
    getRuleBackedQueryLinks: jest.fn().mockResolvedValue(ruleBackedLinks),
  };

  MockedKnowledgeIndicatorService.mockImplementation(
    () =>
      ({
        getClient: jest.fn().mockResolvedValue(kiClient),
      } as unknown as KnowledgeIndicatorService)
  );

  const v2CreateRule = jest.fn().mockResolvedValue(undefined);
  const v1BulkDelete = jest.fn().mockResolvedValue(undefined);
  MockedV2RulesAdapter.mockImplementation(
    () => ({ createRule: v2CreateRule } as unknown as V2RulesAdapter)
  );
  MockedV1RulesAdapter.mockImplementation(
    () => ({ bulkDeleteRules: v1BulkDelete } as unknown as V1RulesAdapter)
  );

  const markInProgress = jest.fn().mockResolvedValue(undefined);
  const markCompleted = jest.fn().mockResolvedValue(undefined);
  const markFailed = jest.fn().mockResolvedValue(undefined);
  MockedStateStore.mockImplementation(
    () =>
      ({
        getState: jest.fn().mockResolvedValue(existingState),
        markInProgress,
        markCompleted,
        markFailed,
      } as unknown as SigEventsV2MigrationStateStore)
  );

  (readSignificantEventsAlertingV2UiEnabled as jest.Mock).mockResolvedValue(v2Active);
  jest.mocked(isSignificantEventsAlertingV2Active).mockReturnValue(v2Active);

  return {
    logger,
    coreStart,
    pluginsStart,
    v2CreateRule,
    v1BulkDelete,
    markCompleted,
    markFailed,
    markInProgress,
  };
}

describe('runSignificantEventsV2Migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips when migration already completed successfully', async () => {
    const deps = makeDeps({
      existingState: {
        status: 'completed',
        migrated_count: 2,
        failed_queries: [],
        completed_at: '2026-01-01T00:00:00.000Z',
      },
    });

    const result = await runSignificantEventsV2Migration({
      coreStart: deps.coreStart,
      pluginsStart: deps.pluginsStart,
      logger: deps.logger,
    });

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('already_completed');
    expect(deps.v2CreateRule).not.toHaveBeenCalled();
  });

  it('skips when alerting v2 is inactive', async () => {
    const deps = makeDeps({ v2Active: false });

    const result = await runSignificantEventsV2Migration({
      coreStart: deps.coreStart,
      pluginsStart: deps.pluginsStart,
      logger: deps.logger,
    });

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('v2_inactive');
    expect(deps.markInProgress).not.toHaveBeenCalled();
  });

  it('creates v2 rules and deletes v1 rules for each rule-backed query', async () => {
    const deps = makeDeps({
      ruleBackedLinks: [makeQueryLink('q1'), makeQueryLink('q2')],
    });

    const result = await runSignificantEventsV2Migration({
      coreStart: deps.coreStart,
      pluginsStart: deps.pluginsStart,
      logger: deps.logger,
    });

    expect(result.skipped).toBe(false);
    expect(result.state.status).toBe('completed');
    expect(result.state.migrated_count).toBe(2);
    expect(deps.v2CreateRule).toHaveBeenCalledTimes(2);
    expect(deps.v1BulkDelete).toHaveBeenCalledTimes(2);
    expect(deps.v1BulkDelete).toHaveBeenCalledWith(['rule-q1']);
    expect(deps.v1BulkDelete).toHaveBeenCalledWith(['rule-q2']);
    expect(deps.markCompleted).toHaveBeenCalled();
  });

  it('records failures without completing migration', async () => {
    const deps = makeDeps();
    deps.v2CreateRule.mockRejectedValueOnce(new Error('create failed'));

    const result = await runSignificantEventsV2Migration({
      coreStart: deps.coreStart,
      pluginsStart: deps.pluginsStart,
      logger: deps.logger,
    });

    expect(result.state.status).toBe('failed');
    expect(result.state.failed_queries).toHaveLength(1);
    expect(deps.markFailed).toHaveBeenCalled();
    expect(deps.markCompleted).not.toHaveBeenCalled();
  });
});
