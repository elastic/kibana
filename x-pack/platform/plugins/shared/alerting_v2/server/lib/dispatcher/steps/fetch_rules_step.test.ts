/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FetchRulesStep } from './fetch_rules_step';
import type { RulesSavedObjectService } from '../../services/rules_saved_object_service/rules_saved_object_service';
import { createRulesSavedObjectService } from '../../services/rules_saved_object_service/rules_saved_object_service.mock';
import { createRuleSoAttributes } from '../../test_utils';
import { createAlertEpisode, createDispatcherPipelineState } from '../fixtures/test_utils';

describe('FetchRulesStep', () => {
  let rulesSoService: RulesSavedObjectService;

  beforeEach(() => {
    ({ rulesSavedObjectService: rulesSoService } = createRulesSavedObjectService());
  });

  it('fetches rules for unique rule IDs from active episodes', async () => {
    jest.spyOn(rulesSoService, 'bulkGetByIds').mockResolvedValue([
      {
        id: 'r1',
        attributes: createRuleSoAttributes({
          metadata: { name: 'Rule 1' },
          notification_policies: [{ ref: 'p1' }],
        }),
      },
    ]);

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
    expect(rulesSoService.bulkGetByIds).toHaveBeenCalledWith(['r1']);
  });

  it('returns empty map when no active episodes', async () => {
    jest.spyOn(rulesSoService, 'bulkGetByIds');
    const step = new FetchRulesStep(rulesSoService);

    const state = createDispatcherPipelineState({ dispatchable: [] });
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.rules?.size).toBe(0);
    expect(rulesSoService.bulkGetByIds).not.toHaveBeenCalled();
  });

  it('skips documents with errors', async () => {
    jest
      .spyOn(rulesSoService, 'bulkGetByIds')
      .mockResolvedValue([{ id: 'r1', error: { statusCode: 404, message: 'Not found' } }] as any);

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
