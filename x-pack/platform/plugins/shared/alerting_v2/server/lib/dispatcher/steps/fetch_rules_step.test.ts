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
  let mockFindByIds: jest.SpyInstance;

  beforeEach(() => {
    ({ rulesSavedObjectService: rulesSoService, mockFindByIds } = createRulesSavedObjectService());
  });

  it('fetches rules for unique rule IDs from active episodes', async () => {
    mockFindByIds.mockResolvedValue([
      {
        id: 'r1',
        attributes: createRuleSoAttributes({
          metadata: { name: 'Rule 1', tags: ['production'] },
        }),
        namespaces: ['default'],
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
    expect(result.data?.rules?.get('r1')?.spaceId).toBe('default');
    expect(mockFindByIds).toHaveBeenCalledWith(['r1']);
  });

  it('derives dependsOn from "rule" artifacts tagged with the depends_on relation, ignoring other relations', async () => {
    mockFindByIds.mockResolvedValue([
      {
        id: 'child',
        attributes: createRuleSoAttributes({
          metadata: { name: 'Child' },
          artifacts: [
            { id: 'a1', type: 'rule', value: 'parent-1', relation: 'depends_on' },
            { id: 'a2', type: 'rule', value: 'parent-2', relation: 'depends_on' },
            // Different relation on the same target type — must NOT be a dependency.
            { id: 'a3', type: 'rule', value: 'sibling', relation: 'related' },
            // Non-rule artifact — ignored.
            { id: 'a4', type: 'dashboard', value: 'dash-1' },
          ],
        }),
        namespaces: ['default'],
      },
    ]);

    const step = new FetchRulesStep(rulesSoService);
    const state = createDispatcherPipelineState({
      dispatchable: [createAlertEpisode({ rule_id: 'child' })],
    });

    const result = await step.execute(state);

    if (result.type !== 'continue') throw new Error('expected continue');
    expect(result.data?.rules?.get('child')?.dependsOn).toEqual(['parent-1', 'parent-2']);
  });

  it('defaults dependsOn to an empty array when the rule has no artifacts', async () => {
    mockFindByIds.mockResolvedValue([
      {
        id: 'r1',
        attributes: createRuleSoAttributes({ metadata: { name: 'Rule 1' } }),
        namespaces: ['default'],
      },
    ]);

    const step = new FetchRulesStep(rulesSoService);
    const state = createDispatcherPipelineState({
      dispatchable: [createAlertEpisode({ rule_id: 'r1' })],
    });

    const result = await step.execute(state);

    if (result.type !== 'continue') throw new Error('expected continue');
    expect(result.data?.rules?.get('r1')?.dependsOn).toEqual([]);
  });

  it('returns empty map when no active episodes', async () => {
    const step = new FetchRulesStep(rulesSoService);

    const state = createDispatcherPipelineState({ dispatchable: [] });
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.rules?.size).toBe(0);
    expect(mockFindByIds).not.toHaveBeenCalled();
  });

  it('passes unique rule IDs to findAll', async () => {
    mockFindByIds.mockResolvedValue([
      {
        id: 'r1',
        attributes: createRuleSoAttributes({ metadata: { name: 'Rule 1' } }),
        namespaces: ['default'],
      },
      {
        id: 'r2',
        attributes: createRuleSoAttributes({ metadata: { name: 'Rule 2' } }),
        namespaces: ['default'],
      },
    ]);

    const step = new FetchRulesStep(rulesSoService);
    const state = createDispatcherPipelineState({
      dispatchable: [
        createAlertEpisode({ rule_id: 'r1' }),
        createAlertEpisode({ rule_id: 'r2', episode_id: 'e2' }),
        createAlertEpisode({ rule_id: 'r1', episode_id: 'e3' }),
      ],
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.rules?.size).toBe(2);
    expect(mockFindByIds).toHaveBeenCalledWith(['r1', 'r2']);
  });

  it('derives spaceId from namespaces for non-default spaces', async () => {
    mockFindByIds.mockResolvedValue([
      {
        id: 'r1',
        attributes: createRuleSoAttributes({ metadata: { name: 'Rule 1' } }),
        namespaces: ['my-space'],
      },
    ]);

    const step = new FetchRulesStep(rulesSoService);
    const state = createDispatcherPipelineState({
      dispatchable: [createAlertEpisode({ rule_id: 'r1' })],
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.rules?.get('r1')?.spaceId).toBe('my-space');
  });

  it('defaults spaceId to default when namespaces is undefined', async () => {
    mockFindByIds.mockResolvedValue([
      {
        id: 'r1',
        attributes: createRuleSoAttributes({ metadata: { name: 'Rule 1' } }),
      },
    ]);

    const step = new FetchRulesStep(rulesSoService);
    const state = createDispatcherPipelineState({
      dispatchable: [createAlertEpisode({ rule_id: 'r1' })],
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.rules?.get('r1')?.spaceId).toBe('default');
  });
});
