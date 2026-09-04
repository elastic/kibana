/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { FetchActiveGroupsStep } from './fetch_active_groups_step';
import {
  collectStreamResults,
  createEsqlResponse,
  createPipelineStream,
  createRuleExecutionInput,
  createRuleResponse,
  createRulePipelineState,
} from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createQueryService } from '../../services/query_service/query_service.mock';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { PluginConfig } from '../../../config';

describe('FetchActiveGroupsStep', () => {
  function createStep(maxAlerts = 10000, maxGroupsPerExecution = 10000) {
    const internal = createQueryService();
    const logger = createLoggerService();

    const config: PluginConfig = {
      enabled: true,
      invalidateApiKeysTask: { interval: '5m', removalDelay: '1h' },
      rules: {
        minimumScheduleInterval: '1m',
        maxScheduledPerMinute: 400,
        run: {
          alerts: { max: maxAlerts },
          maxGroupsPerExecution,
          query: { maxResponseSize: 50 * 1024 * 1024 },
        },
      },
      esql: { responseFormat: 'json' },
    };
    const pluginConfigAccessor =
      coreMock.createPluginInitializerContext<PluginConfig>(config).config;

    const step = new FetchActiveGroupsStep(
      logger.loggerService,
      internal.queryService,
      pluginConfigAccessor
    );
    return { step, internalEsClient: internal.mockEsClient, mockLogger: logger.mockLogger };
  }

  function mockActiveGroups(
    internalEsClient: ReturnType<typeof createStep>['internalEsClient'],
    groupHashes: string[]
  ) {
    internalEsClient.esql.query.mockResolvedValue(
      createEsqlResponse(
        [{ name: 'group_hash', type: 'keyword' }],
        groupHashes.map((hash) => [hash])
      )
    );
  }

  it('fetches active groups and threads them onto state for alert-kind rules with absence classification', async () => {
    const { step, internalEsClient } = createStep();
    mockActiveGroups(internalEsClient, ['group-a', 'group-b']);

    const input = createRuleExecutionInput();
    const rule = createRuleResponse({ kind: 'alert', recovery_strategy: 'no_breach' });

    const state = createRulePipelineState({ input, rule });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    if (result.type !== 'continue') throw new Error('expected a continue result');
    expect(internalEsClient.esql.query).toHaveBeenCalledTimes(1);
    expect(result.state.activeGroups).toEqual([
      { group_hash: 'group-a' },
      { group_hash: 'group-b' },
    ]);
  });

  it('fetches active groups for alert-kind rules even when absence classification is disabled (to protect live episodes from the group cap)', async () => {
    const { step, internalEsClient } = createStep();
    mockActiveGroups(internalEsClient, ['group-a', 'group-b']);

    const input = createRuleExecutionInput();
    const rule = createRuleResponse({ kind: 'alert', recovery_strategy: 'none' });

    const state = createRulePipelineState({ input, rule });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    if (result.type !== 'continue') throw new Error('expected a continue result');
    expect(internalEsClient.esql.query).toHaveBeenCalledTimes(1);
    expect(result.state.activeGroups).toEqual([
      { group_hash: 'group-a' },
      { group_hash: 'group-b' },
    ]);
  });

  it('bounds the fetch with alerts.max as an explicit LIMIT, decoupled from maxGroupsPerExecution', async () => {
    const { step, internalEsClient } = createStep(2500);
    mockActiveGroups(internalEsClient, ['group-a']);

    const input = createRuleExecutionInput();
    const rule = createRuleResponse({ kind: 'alert' });

    const state = createRulePipelineState({ input, rule });
    await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(internalEsClient.esql.query).toHaveBeenCalledTimes(1);
    const [request] = internalEsClient.esql.query.mock.calls[0];
    expect(request.query).toContain('| LIMIT 2500');
  });

  it('warns that the active set may be truncated when the fetch hits alerts.max', async () => {
    const { step, internalEsClient, mockLogger } = createStep(2);
    mockActiveGroups(internalEsClient, ['group-a', 'group-b']);

    const input = createRuleExecutionInput();
    const rule = createRuleResponse({ kind: 'alert' });

    const state = createRulePipelineState({ input, rule });
    await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('hit alerts.max=2'),
      expect.objectContaining({
        labels: expect.objectContaining({
          code: ALERTING_LOG_CODES.RULE_EXECUTION_ACTIVE_GROUPS_TRUNCATED,
        }),
      })
    );
  });

  it('does not warn when the fetch stays below the limit', async () => {
    const { step, internalEsClient, mockLogger } = createStep(10);
    mockActiveGroups(internalEsClient, ['group-a', 'group-b']);

    const input = createRuleExecutionInput();
    const rule = createRuleResponse({ kind: 'alert' });

    const state = createRulePipelineState({ input, rule });
    await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('passes through without querying for signal-kind rules', async () => {
    const { step, internalEsClient } = createStep();

    const input = createRuleExecutionInput();
    const rule = createRuleResponse({ kind: 'signal' });

    const state = createRulePipelineState({ input, rule });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    if (result.type !== 'continue') throw new Error('expected a continue result');
    expect(internalEsClient.esql.query).not.toHaveBeenCalled();
    expect(result.state.activeGroups).toBeUndefined();
  });

  it('halts with state_not_ready when rule is missing from state', async () => {
    const { step, internalEsClient } = createStep();

    const state = createRulePipelineState();
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready', state });
    expect(internalEsClient.esql.query).not.toHaveBeenCalled();
  });
});
