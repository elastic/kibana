/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { FetchRuleStep } from './fetch_rule_step';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import {
  collectStreamResults,
  createPipelineStream,
  createRuleExecutionInput,
  createRulePipelineState,
  createRuleSoAttributes,
} from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createRulesClient } from '../../rules_client/rules_client.mock';

// Note: RulesClient converts SavedObjectsError to Boom errors internally,
// so we test by triggering SO errors and verifying the step handles the resulting Boom errors.

describe('FetchRuleStep', () => {
  let step: FetchRuleStep;
  let mockSavedObjectsClient: ReturnType<typeof createRulesClient>['mockSavedObjectsClient'];

  beforeEach(() => {
    const { loggerService } = createLoggerService();
    const { rulesClient, mockSavedObjectsClient: soClient } = createRulesClient();
    mockSavedObjectsClient = soClient;
    step = new FetchRuleStep(loggerService, rulesClient);
  });

  it('returns rule when rule exists', async () => {
    const ruleAttributes = createRuleSoAttributes();
    mockSavedObjectsClient.get.mockResolvedValue({
      id: 'rule-1',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: ruleAttributes,
      references: [],
    });

    const state = createRulePipelineState();
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result.type).toBe('continue');
    expect(result.state.rule).toBeDefined();
    expect(result.state.rule?.id).toBe('rule-1');
    expect(result.state.rule?.metadata.name).toBe('test-rule');
  });

  it('halts with rule_deleted when rule is not found', async () => {
    mockSavedObjectsClient.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError(RULE_SAVED_OBJECT_TYPE, 'rule-1')
    );

    const state = createRulePipelineState();
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({
      type: 'halt',
      reason: 'rule_deleted',
      state,
    });
  });

  it('propagates errors other than NotFoundError', async () => {
    mockSavedObjectsClient.get.mockRejectedValue(new Error('Failed'));

    const state = createRulePipelineState();

    await expect(
      collectStreamResults(step.executeStream(createPipelineStream([state])))
    ).rejects.toThrow('Failed');
  });

  it('calls the ruleClient with correct params', async () => {
    const ruleAttributes = createRuleSoAttributes();
    mockSavedObjectsClient.get.mockResolvedValue({
      id: 'custom-rule',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: ruleAttributes,
      references: [],
    });

    const state = createRulePipelineState({
      input: createRuleExecutionInput({ ruleId: 'custom-rule' }),
    });

    await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      'custom-rule',
      undefined
    );
  });
});
