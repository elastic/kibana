/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { FetchRuleStep } from './fetch_rule_step';
import type { RuleSavedObjectAttributes } from '../../../saved_objects';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { createRuleExecutionInput, createRulePipelineState } from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createRulesClient } from '../../rules_client/rules_client.mock';

// Note: RulesClient converts SavedObjectsError to Boom errors internally,
// so we test by triggering SO errors and verifying the step handles the resulting Boom errors.

describe('FetchRuleStep', () => {
  let step: FetchRuleStep;
  let mockSavedObjectsClient: ReturnType<typeof createRulesClient>['mockSavedObjectsClient'];

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

  beforeEach(() => {
    const { loggerService } = createLoggerService();
    const { rulesClient, mockSavedObjectsClient: soClient } = createRulesClient();
    mockSavedObjectsClient = soClient;
    step = new FetchRuleStep(loggerService, rulesClient);
  });

  it('returns rule when rule exists', async () => {
    const ruleAttributes = createRuleAttributes();
    mockSavedObjectsClient.get.mockResolvedValue({
      id: 'rule-1',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: ruleAttributes,
      references: [],
    });

    const state = createRulePipelineState();
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(result).toHaveProperty('data.rule');

    // @ts-expect-error: the above check ensures the rule exists
    const { rule } = result.data;
    expect(rule.id).toBe('rule-1');
    expect(rule.name).toBe('test-rule');
  });

  it('halts with rule_deleted when rule is not found', async () => {
    mockSavedObjectsClient.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError(RULE_SAVED_OBJECT_TYPE, 'rule-1')
    );

    const state = createRulePipelineState();
    const result = await step.execute(state);

    expect(result).toEqual({
      type: 'halt',
      reason: 'rule_deleted',
    });
  });

  it('propagates errors other than NotFoundError', async () => {
    mockSavedObjectsClient.get.mockRejectedValue(new Error('Failed'));

    const state = createRulePipelineState();

    await expect(step.execute(state)).rejects.toThrow('Failed');
  });

  it('calls the ruleClient with correct params', async () => {
    const ruleAttributes = createRuleAttributes();
    mockSavedObjectsClient.get.mockResolvedValue({
      id: 'custom-rule',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: ruleAttributes,
      references: [],
    });

    const state = createRulePipelineState({
      input: createRuleExecutionInput({ ruleId: 'custom-rule' }),
    });

    await step.execute(state);

    expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      'custom-rule',
      undefined
    );
  });
});
