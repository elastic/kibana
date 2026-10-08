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
import {
  createAlert,
  createDispatcherPipelineState,
  createStepLogger,
} from '../fixtures/test_utils';

const logger = createStepLogger();

describe('FetchRulesStep', () => {
  let rulesSoService: RulesSavedObjectService;
  let mockFindByIds: jest.SpyInstance;

  beforeEach(() => {
    ({ rulesSavedObjectService: rulesSoService, mockFindByIds } = createRulesSavedObjectService());
  });

  it('fetches rules for unique rule IDs from active alerts', async () => {
    mockFindByIds.mockResolvedValue([
      {
        id: 'r1',
        attributes: createRuleSoAttributes({
          metadata: { name: 'Rule 1', tags: ['production'], routing_tags: ['sre'] },
        }),
        namespaces: ['default'],
      },
    ]);

    const step = new FetchRulesStep(rulesSoService);
    const state = createDispatcherPipelineState({
      dispatchable: [
        createAlert({ rule_id: 'r1' }),
        createAlert({ rule_id: 'r1', alert_id: 'e2' }),
      ],
    });

    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.rules?.size).toBe(1);
    expect(result.data?.rules?.get('r1')?.name).toBe('Rule 1');
    expect(result.data?.rules?.get('r1')?.spaceId).toBe('default');
    expect(result.data?.rules?.get('r1')?.routingTags).toEqual(['sre']);
    expect(mockFindByIds).toHaveBeenCalledWith(['r1']);
  });

  it('defaults routing tags to an empty list when the rule has none', async () => {
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
      dispatchable: [createAlert({ rule_id: 'r1' })],
    });

    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.rules?.get('r1')?.routingTags).toEqual([]);
  });

  it('returns empty map when no active alerts', async () => {
    const step = new FetchRulesStep(rulesSoService);

    const state = createDispatcherPipelineState({ dispatchable: [] });
    const result = await step.execute(state, logger);

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
        createAlert({ rule_id: 'r1' }),
        createAlert({ rule_id: 'r2', alert_id: 'e2' }),
        createAlert({ rule_id: 'r1', alert_id: 'e3' }),
      ],
    });

    const result = await step.execute(state, logger);

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
      dispatchable: [createAlert({ rule_id: 'r1' })],
    });

    const result = await step.execute(state, logger);

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
      dispatchable: [createAlert({ rule_id: 'r1' })],
    });

    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.rules?.get('r1')?.spaceId).toBe('default');
  });

  it('excludes alerts with null rule_id from the findByIds call', async () => {
    mockFindByIds.mockResolvedValue([
      {
        id: 'r1',
        attributes: createRuleSoAttributes({ metadata: { name: 'Rule 1' } }),
        namespaces: ['default'],
      },
    ]);

    const step = new FetchRulesStep(rulesSoService);
    const state = createDispatcherPipelineState({
      dispatchable: [
        createAlert({ rule_id: 'r1' }),
        createAlert({ source: 'pagerduty', rule_id: null, alert_id: 'ext-1' }),
        createAlert({ source: 'datadog', rule_id: null, alert_id: 'ext-2' }),
      ],
    });

    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(mockFindByIds).toHaveBeenCalledWith(['r1']);
    expect(result.data?.rules?.size).toBe(1);
  });

  it('does not call findByIds when all alerts have null rule_id', async () => {
    const step = new FetchRulesStep(rulesSoService);
    const state = createDispatcherPipelineState({
      dispatchable: [
        createAlert({ source: 'pagerduty', rule_id: null, alert_id: 'ext-1' }),
        createAlert({ source: 'datadog', rule_id: null, alert_id: 'ext-2' }),
      ],
    });

    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(mockFindByIds).not.toHaveBeenCalled();
    expect(result.data?.rules?.size).toBe(0);
  });
});
