/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { FetchRuleStep } from './fetch_rule_step';
import type { RulePipelineState, RuleExecutionInput } from '../types';
import { RULE_SAVED_OBJECT_TYPE, type RuleSavedObjectAttributes } from '../../../saved_objects';
import { createRuleExecutionInput } from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createRulesClient } from '../../rules_client/rules_client.mock';

// Note: RulesClient converts SavedObjectsError to Boom errors internally,
// so we test by triggering SO errors and verifying the step handles the resulting Boom errors.

describe('FetchRuleStep', () => {
  const createRuleAttributes = (
    overrides: Partial<RuleSavedObjectAttributes> = {}
  ): RuleSavedObjectAttributes => ({
    name: 'test-rule',
    tags: [],
    schedule: { custom: '1m' },
    enabled: true,
    query: 'FROM logs-* | LIMIT 1',
    timeField: '@timestamp',
    lookbackWindow: '1m',
    groupingKey: [],
    createdBy: 'elastic',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedBy: 'elastic',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  });

  const createState = (input: RuleExecutionInput): RulePipelineState => ({ input });

  it('returns rule when rule exists', async () => {
    const { loggerService } = createLoggerService();
    const { rulesClient, mockSavedObjectsClient } = createRulesClient();

    const ruleAttributes = createRuleAttributes();
    mockSavedObjectsClient.get.mockResolvedValue({
      id: 'rule-1',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: ruleAttributes,
      references: [],
    });

    const step = new FetchRuleStep(loggerService, rulesClient);
    const input = createRuleExecutionInput();
    const state = createState(input);

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(result).toHaveProperty('data.rule');

    // @ts-expect-error: the above check ensures the rule exists
    const { rule } = result.data;
    expect(rule.id).toBe('rule-1');
    expect(rule.name).toBe('test-rule');
  });

  it('halts with rule_deleted when rule is not found', async () => {
    const { loggerService } = createLoggerService();
    const { rulesClient, mockSavedObjectsClient } = createRulesClient();

    mockSavedObjectsClient.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError(RULE_SAVED_OBJECT_TYPE, 'rule-1')
    );

    const step = new FetchRuleStep(loggerService, rulesClient);
    const input = createRuleExecutionInput();
    const state = createState(input);

    const result = await step.execute(state);

    expect(result).toEqual({
      type: 'halt',
      reason: 'rule_deleted',
    });
  });

  it('propagates non-NotFound errors', async () => {
    const { loggerService } = createLoggerService();
    const { rulesClient, mockSavedObjectsClient } = createRulesClient();

    mockSavedObjectsClient.get.mockRejectedValue(new Error('Failed'));

    const step = new FetchRuleStep(loggerService, rulesClient);
    const input = createRuleExecutionInput();
    const state = createState(input);

    await expect(step.execute(state)).rejects.toThrow('Failed');
  });

  it('calls the ruleClient with correct params', async () => {
    const { loggerService } = createLoggerService();
    const { rulesClient, mockSavedObjectsClient } = createRulesClient();

    const ruleAttributes = createRuleAttributes();
    mockSavedObjectsClient.get.mockResolvedValue({
      id: 'custom-rule',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: ruleAttributes,
      references: [],
    });

    const step = new FetchRuleStep(loggerService, rulesClient);
    const input = createRuleExecutionInput({ ruleId: 'custom-rule' });
    const state = createState(input);

    await step.execute(state);

    expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      'custom-rule',
      undefined
    );
  });
});
