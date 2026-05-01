/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicySavedObjectService } from '../../services/action_policy_saved_object_service/action_policy_saved_object_service';
import { createActionPolicySavedObjectService } from '../../services/action_policy_saved_object_service/action_policy_saved_object_service.mock';
import { createDispatcherPipelineState } from '../fixtures/test_utils';
import { FetchPoliciesStep } from './fetch_policies_step';

describe('FetchPoliciesStep', () => {
  let npSoService: ActionPolicySavedObjectService;
  let mockFindAllDecrypted: jest.SpyInstance;

  beforeEach(() => {
    ({ actionPolicySavedObjectService: npSoService, mockFindAllDecrypted } =
      createActionPolicySavedObjectService());
  });

  it('fetches all decrypted policies via findAllDecrypted', async () => {
    mockFindAllDecrypted.mockResolvedValue([
      {
        id: 'p1',
        attributes: {
          name: 'Policy 1',
          description: 'Test',
          destinations: [{ type: 'workflow' as const, id: 'w1' }],
          matcher: null,
          groupBy: null,
          throttle: null,
          auth: { apiKey: 'decrypted-key', owner: 'elastic', createdByUser: false },
          createdBy: null,
          updatedBy: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    ]);

    const step = new FetchPoliciesStep(npSoService);
    const state = createDispatcherPipelineState();

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.policies?.size).toBe(1);

    const policy = result.data?.policies?.get('p1');
    expect(policy?.name).toBe('Policy 1');
    expect(policy?.apiKey).toBe('decrypted-key');
    expect(policy?.matcher).toBeUndefined();
    expect(policy?.groupBy).toEqual([]);
    expect(policy?.tags).toEqual([]);
    expect(policy?.throttle).toBeUndefined();
    expect(policy?.snoozedUntil).toBeNull();

    expect(mockFindAllDecrypted).toHaveBeenCalledWith({ filter: { enabled: true } });
  });

  it('returns empty map when no policies exist', async () => {
    mockFindAllDecrypted.mockResolvedValue([]);

    const step = new FetchPoliciesStep(npSoService);
    const state = createDispatcherPipelineState();

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.policies?.size).toBe(0);
  });

  it('skips documents with errors', async () => {
    mockFindAllDecrypted.mockResolvedValue([
      { id: 'p1', error: { statusCode: 500, message: 'Decryption failed', error: 'Error' } },
    ]);

    const step = new FetchPoliciesStep(npSoService);
    const state = createDispatcherPipelineState();

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.policies?.size).toBe(0);
  });

  it('fetches multiple policies', async () => {
    mockFindAllDecrypted.mockResolvedValue([
      {
        id: 'p1',
        attributes: {
          name: 'Policy 1',
          destinations: [{ type: 'workflow' as const, id: 'w1' }],
          auth: { apiKey: 'key-1', owner: 'elastic', createdByUser: false },
          createdBy: null,
          updatedBy: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
      {
        id: 'p2',
        attributes: {
          name: 'Policy 2',
          destinations: [],
          auth: { apiKey: 'key-2', owner: 'elastic', createdByUser: false },
          createdBy: null,
          updatedBy: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    ]);

    const step = new FetchPoliciesStep(npSoService);
    const state = createDispatcherPipelineState();

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.policies?.size).toBe(2);
    expect(result.data?.policies?.get('p1')?.apiKey).toBe('key-1');
    expect(result.data?.policies?.get('p2')?.apiKey).toBe('key-2');
    expect(mockFindAllDecrypted).toHaveBeenCalledWith({ filter: { enabled: true } });
  });
});
