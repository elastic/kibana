/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FetchPoliciesStep } from './fetch_policies_step';
import type { NotificationPolicySavedObjectServiceContract } from '../../services/notification_policy_saved_object_service/notification_policy_saved_object_service';
import { createDispatcherPipelineState, createRule } from '../fixtures/test_utils';

const createMockNpSoService = (): jest.Mocked<NotificationPolicySavedObjectServiceContract> => ({
  bulkGetByIds: jest.fn(),
  create: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('FetchPoliciesStep', () => {
  it('fetches unique policies from rules', async () => {
    const mockService = createMockNpSoService();
    mockService.bulkGetByIds.mockResolvedValue([
      {
        id: 'p1',
        attributes: {
          name: 'Policy 1',
          workflow_id: 'w1',
        },
      },
    ] as any);

    const step = new FetchPoliciesStep(mockService);
    const state = createDispatcherPipelineState({
      rules: new Map([
        ['r1', createRule({ id: 'r1', notificationPolicyIds: ['p1'] })],
        ['r2', createRule({ id: 'r2', notificationPolicyIds: ['p1'] })],
      ]),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.policies?.size).toBe(1);
    expect(result.data?.policies?.get('p1')?.name).toBe('Policy 1');
    expect(mockService.bulkGetByIds).toHaveBeenCalledWith(['p1']);
  });

  it('returns empty map when rules is empty', async () => {
    const mockService = createMockNpSoService();
    const step = new FetchPoliciesStep(mockService);

    const state = createDispatcherPipelineState({ rules: new Map() });
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.policies?.size).toBe(0);
    expect(mockService.bulkGetByIds).not.toHaveBeenCalled();
  });

  it('returns empty map when rules have no policy IDs', async () => {
    const mockService = createMockNpSoService();
    const step = new FetchPoliciesStep(mockService);

    const state = createDispatcherPipelineState({
      rules: new Map([['r1', createRule({ id: 'r1', notificationPolicyIds: [] })]]),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.policies?.size).toBe(0);
    expect(mockService.bulkGetByIds).not.toHaveBeenCalled();
  });

  it('skips documents with errors', async () => {
    const mockService = createMockNpSoService();
    mockService.bulkGetByIds.mockResolvedValue([
      { id: 'p1', error: { statusCode: 404, message: 'Not found' } },
    ] as any);

    const step = new FetchPoliciesStep(mockService);
    const state = createDispatcherPipelineState({
      rules: new Map([['r1', createRule({ id: 'r1', notificationPolicyIds: ['p1'] })]]),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.policies?.size).toBe(0);
  });
});
