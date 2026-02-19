/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateRecoveryEventsStep } from './create_recovery_events_step';
import {
  createRulePipelineState,
  createAlertEvent,
  createRuleResponse,
  createEsqlResponse,
} from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createQueryService } from '../../services/query_service/query_service.mock';

describe('CreateRecoveryEventsStep', () => {
  const { loggerService } = createLoggerService();

  function createActiveGroupHashesResponse(groupHashes: string[]) {
    return createEsqlResponse(
      [{ name: 'group_hash', type: 'keyword' }],
      groupHashes.map((h) => [h])
    );
  }

  it('creates recovery events for active groups not in the breached set', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new CreateRecoveryEventsStep(loggerService, queryService);

    mockEsClient.esql.query.mockResolvedValue(
      createActiveGroupHashesResponse(['hash-1', 'hash-2', 'hash-3'])
    );

    const breachedEvents = [createAlertEvent({ group_hash: 'hash-1' })];

    const state = createRulePipelineState({
      rule: createRuleResponse({ kind: 'alert' }),
      alertEvents: breachedEvents,
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(result).toHaveProperty('data.alertEvents');

    // @ts-expect-error: the above check ensures the alertEvents exists
    const { alertEvents } = result.data;

    expect(alertEvents).toHaveLength(3);
    expect(alertEvents[0].status).toBe('breached');
    expect(alertEvents[0].group_hash).toBe('hash-1');
    expect(alertEvents[1].status).toBe('recovered');
    expect(alertEvents[1].group_hash).toBe('hash-2');
    expect(alertEvents[2].status).toBe('recovered');
    expect(alertEvents[2].group_hash).toBe('hash-3');
  });

  it('skips recovery for non-alert rules', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new CreateRecoveryEventsStep(loggerService, queryService);

    const alertEvents = [createAlertEvent({ group_hash: 'hash-1' })];

    const state = createRulePipelineState({
      rule: createRuleResponse({ kind: 'signal' }),
      alertEvents,
    });

    const result = await step.execute(state);

    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
    expect(result).toEqual({ type: 'continue', data: { alertEvents } });
  });

  it('returns original events when no active groups exist', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new CreateRecoveryEventsStep(loggerService, queryService);

    mockEsClient.esql.query.mockResolvedValue(createActiveGroupHashesResponse([]));

    const alertEvents = [createAlertEvent({ group_hash: 'hash-1' })];

    const state = createRulePipelineState({
      rule: createRuleResponse({ kind: 'alert' }),
      alertEvents,
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue', data: { alertEvents } });
  });

  it('does not create recovery events for groups that are still breaching', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new CreateRecoveryEventsStep(loggerService, queryService);

    mockEsClient.esql.query.mockResolvedValue(
      createActiveGroupHashesResponse(['hash-1', 'hash-2'])
    );

    const alertEvents = [
      createAlertEvent({ group_hash: 'hash-1' }),
      createAlertEvent({ group_hash: 'hash-2' }),
    ];

    const state = createRulePipelineState({
      rule: createRuleResponse({ kind: 'alert' }),
      alertEvents,
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    // @ts-expect-error: the above check ensures the alertEvents exists
    const { alertEvents: resultEvents } = result.data;
    expect(resultEvents).toHaveLength(2);
    expect(resultEvents.every((e: { status: string }) => e.status === 'breached')).toBe(true);
  });

  it('creates recovery events for all active groups when no breached events exist', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new CreateRecoveryEventsStep(loggerService, queryService);

    mockEsClient.esql.query.mockResolvedValue(
      createActiveGroupHashesResponse(['hash-1', 'hash-2'])
    );

    const state = createRulePipelineState({
      rule: createRuleResponse({ kind: 'alert' }),
      alertEvents: [],
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    // @ts-expect-error: the above check ensures the alertEvents exists
    const { alertEvents } = result.data;
    expect(alertEvents).toHaveLength(2);
    expect(alertEvents.every((e: { status: string }) => e.status === 'recovered')).toBe(true);
  });

  it('halts with state_not_ready when rule is missing from state', async () => {
    const { queryService } = createQueryService();
    const step = new CreateRecoveryEventsStep(loggerService, queryService);

    const state = createRulePipelineState({ alertEvents: [createAlertEvent()] });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready' });
  });

  it('halts with state_not_ready when alertEvents is missing from state', async () => {
    const { queryService } = createQueryService();
    const step = new CreateRecoveryEventsStep(loggerService, queryService);

    const state = createRulePipelineState({ rule: createRuleResponse() });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready' });
  });
});
