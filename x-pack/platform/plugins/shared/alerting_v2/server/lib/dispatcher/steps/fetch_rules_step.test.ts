/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { FetchRulesStep } from './fetch_rules_step';
import type { RulesSavedObjectService } from '../../services/rules_saved_object_service/rules_saved_object_service';
import { createRulesSavedObjectService } from '../../services/rules_saved_object_service/rules_saved_object_service.mock';
import { createRuleSoAttributes } from '../../test_utils';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { createAlertEpisode, createDispatcherPipelineState } from '../fixtures/test_utils';

describe('FetchRulesStep', () => {
  let rulesSoService: RulesSavedObjectService;
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    ({ rulesSavedObjectService: rulesSoService, mockSavedObjectsClient } =
      createRulesSavedObjectService());
  });

  it('fetches rules for unique rule IDs from active episodes', async () => {
    mockSavedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          id: 'r1',
          type: RULE_SAVED_OBJECT_TYPE,
          attributes: createRuleSoAttributes({
            metadata: { name: 'Rule 1' },
            notification_policies: [{ ref: 'p1' }],
          }),
          references: [],
        },
      ],
    });

    const step = new FetchRulesStep(rulesSoService);
    const state = createDispatcherPipelineState({
      dispatchable: [
        createAlertEpisode({ rule_id: 'r1' }),
        createAlertEpisode({ rule_id: 'r1', episode_id: 'e2' }),
      ],
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.rules?.size).toBe(1);
    expect(result.data?.rules?.get('r1')?.name).toBe('Rule 1');
    expect(mockSavedObjectsClient.bulkGet).toHaveBeenCalledWith([
      { type: RULE_SAVED_OBJECT_TYPE, id: 'r1' },
    ]);
  });

  it('returns empty map when no active episodes', async () => {
    const step = new FetchRulesStep(rulesSoService);

    const state = createDispatcherPipelineState({ dispatchable: [] });
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.rules?.size).toBe(0);
    expect(mockSavedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  it('skips documents with errors', async () => {
    mockSavedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          id: 'r1',
          type: RULE_SAVED_OBJECT_TYPE,
          attributes: {},
          references: [],
          error: { statusCode: 404, message: 'Not found', error: 'Not Found' },
        },
      ],
    } as any);

    const step = new FetchRulesStep(rulesSoService);
    const state = createDispatcherPipelineState({
      dispatchable: [createAlertEpisode({ rule_id: 'r1' })],
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.rules?.size).toBe(0);
  });
});
