/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

describe('FetchActiveGroupsStep', () => {
  function createStep() {
    const internal = createQueryService();
    const step = new FetchActiveGroupsStep(
      createLoggerService().loggerService,
      internal.queryService
    );
    return { step, internalEsClient: internal.mockEsClient };
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

  it('fetches active groups and threads them onto state when absence classification is enabled', async () => {
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

  it('passes through without querying when absence classification is disabled', async () => {
    const { step, internalEsClient } = createStep();

    const input = createRuleExecutionInput();
    const rule = createRuleResponse({ kind: 'alert', recovery_strategy: 'none' });

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
