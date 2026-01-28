/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateAlertEventsStep } from './create_alert_events_step';
import type { RulePipelineState, RuleExecutionInput } from '../types';
import type { RuleResponse } from '../../rules_client';
import { ALERT_EVENTS_DATA_STREAM } from '../../../resources/alert_events';
import { createRuleExecutionInput, createRuleResponse, createEsqlResponse } from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createStorageService } from '../../services/storage_service/storage_service.mock';
import type { ESQLSearchResponse } from '@kbn/es-types';

describe('CreateAlertEventsStep', () => {
  const createState = (
    input: RuleExecutionInput,
    rule?: RuleResponse,
    esqlResponse?: ESQLSearchResponse
  ): RulePipelineState => ({
    input,
    rule,
    esqlResponse,
  });

  it('builds alert events and stores them correctly', async () => {
    const { loggerService } = createLoggerService();
    const { storageService, mockEsClient } = createStorageService();
    const input = createRuleExecutionInput();
    const rule = createRuleResponse();
    const esqlResponse = createEsqlResponse();

    mockEsClient.bulk.mockResolvedValue({
      items: [],
      errors: false,
      took: 1,
    });

    const step = new CreateAlertEventsStep(loggerService, storageService);
    const state = createState(input, rule, esqlResponse);
    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    expect(mockEsClient.bulk).toHaveBeenCalledTimes(1);

    const bulkCall = mockEsClient.bulk.mock.calls[0][0];
    const operations = bulkCall.operations as Array<Record<string, unknown>>;

    expect(operations).toHaveLength(4);

    expect(operations[0]).toEqual({
      create: { _index: ALERT_EVENTS_DATA_STREAM, _id: expect.any(String) },
    });

    expect(operations[1]).toEqual({
      '@timestamp': expect.any(String),
      scheduled_timestamp: input.scheduledAt,
      rule: { id: rule.id, version: 1 },
      group_hash: expect.any(String),
      data: { 'host.name': 'host-a' },
      status: 'breached',
      source: 'internal',
      type: 'signal',
    });

    expect(operations[2]).toEqual({
      create: { _index: ALERT_EVENTS_DATA_STREAM, _id: expect.any(String) },
    });

    expect(operations[3]).toEqual({
      '@timestamp': expect.any(String),
      scheduled_timestamp: input.scheduledAt,
      rule: { id: rule.id, version: 1 },
      group_hash: expect.any(String),
      data: { 'host.name': 'host-b' },
      status: 'breached',
      source: 'internal',
      type: 'signal',
    });
  });

  it('halts with state_not_ready when rule is missing from state', async () => {
    const { loggerService } = createLoggerService();
    const { storageService } = createStorageService();

    const step = new CreateAlertEventsStep(loggerService, storageService);
    const state = createState(createRuleExecutionInput(), undefined, createEsqlResponse());

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready' });
  });

  it('halts with state_not_ready when esqlResponse is missing from state', async () => {
    const { loggerService } = createLoggerService();
    const { storageService } = createStorageService();

    const step = new CreateAlertEventsStep(loggerService, storageService);
    const state = createState(createRuleExecutionInput(), createRuleResponse(), undefined);

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready' });
  });

  it('propagates storage service errors', async () => {
    const { loggerService } = createLoggerService();
    const { storageService, mockEsClient } = createStorageService();

    mockEsClient.bulk.mockRejectedValue(new Error('Bulk index failed'));

    const step = new CreateAlertEventsStep(loggerService, storageService);
    const state = createState(
      createRuleExecutionInput(),
      createRuleResponse(),
      createEsqlResponse()
    );

    await expect(step.execute(state)).rejects.toThrow('Bulk index failed');
  });
});
