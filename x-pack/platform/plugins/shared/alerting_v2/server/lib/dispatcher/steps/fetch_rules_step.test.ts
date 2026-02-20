/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FetchRulesStep } from './fetch_rules_step';
import type { RulesSavedObjectServiceContract } from '../../services/rules_saved_object_service/rules_saved_object_service';
import { createAlertEpisode, createDispatcherPipelineState } from '../fixtures/test_utils';

const createMockRulesSoService = (): jest.Mocked<RulesSavedObjectServiceContract> => ({
  bulkGetByIds: jest.fn(),
  create: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  find: jest.fn(),
});

describe('FetchRulesStep', () => {
  it('fetches rules for unique rule IDs from active episodes', async () => {
    const mockService = createMockRulesSoService();
    mockService.bulkGetByIds.mockResolvedValue([
      {
        id: 'r1',
        attributes: {
          metadata: { name: 'Rule 1' },
          notification_policies: [{ ref: 'p1' }],
          enabled: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    ] as any);

    const step = new FetchRulesStep(mockService);
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
    expect(mockService.bulkGetByIds).toHaveBeenCalledWith(['r1']);
  });

  it('returns empty map when no active episodes', async () => {
    const mockService = createMockRulesSoService();
    const step = new FetchRulesStep(mockService);

    const state = createDispatcherPipelineState({ dispatchable: [] });
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.rules?.size).toBe(0);
    expect(mockService.bulkGetByIds).not.toHaveBeenCalled();
  });

  it('skips documents with errors', async () => {
    const mockService = createMockRulesSoService();
    mockService.bulkGetByIds.mockResolvedValue([
      { id: 'r1', error: { statusCode: 404, message: 'Not found' } },
    ] as any);

    const step = new FetchRulesStep(mockService);
    const state = createDispatcherPipelineState({
      dispatchable: [createAlertEpisode({ rule_id: 'r1' })],
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.rules?.size).toBe(0);
  });
});
