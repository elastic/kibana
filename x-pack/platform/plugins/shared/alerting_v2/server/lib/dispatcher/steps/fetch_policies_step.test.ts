/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { FetchPoliciesStep } from './fetch_policies_step';
import type { NotificationPolicySavedObjectService } from '../../services/notification_policy_saved_object_service/notification_policy_saved_object_service';
import { createNotificationPolicySavedObjectService } from '../../services/notification_policy_saved_object_service/notification_policy_saved_object_service.mock';
import { NOTIFICATION_POLICY_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { createDispatcherPipelineState, createRule } from '../fixtures/test_utils';

describe('FetchPoliciesStep', () => {
  let npSoService: NotificationPolicySavedObjectService;
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    ({ notificationPolicySavedObjectService: npSoService, mockSavedObjectsClient } =
      createNotificationPolicySavedObjectService());
  });

  it('fetches unique policies from rules', async () => {
    mockSavedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          id: 'p1',
          type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          attributes: {
            name: 'Policy 1',
            description: 'Test',
            destinations: [{ type: 'workflow' as const, id: 'w1' }],
            createdBy: null,
            updatedBy: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          references: [],
        },
      ],
    });

    const step = new FetchPoliciesStep(npSoService);
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
    expect(mockSavedObjectsClient.bulkGet).toHaveBeenCalledWith(
      [{ type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE, id: 'p1' }],
      undefined
    );
  });

  it('returns empty map when rules is empty', async () => {
    const step = new FetchPoliciesStep(npSoService);

    const state = createDispatcherPipelineState({ rules: new Map() });
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.policies?.size).toBe(0);
    expect(mockSavedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  it('returns empty map when rules have no policy IDs', async () => {
    const step = new FetchPoliciesStep(npSoService);

    const state = createDispatcherPipelineState({
      rules: new Map([['r1', createRule({ id: 'r1', notificationPolicyIds: [] })]]),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.policies?.size).toBe(0);
    expect(mockSavedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  it('skips documents with errors', async () => {
    mockSavedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          id: 'p1',
          type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          attributes: {},
          references: [],
          error: { statusCode: 404, message: 'Not found', error: 'Not Found' },
        },
      ],
    } as any);

    const step = new FetchPoliciesStep(npSoService);
    const state = createDispatcherPipelineState({
      rules: new Map([['r1', createRule({ id: 'r1', notificationPolicyIds: ['p1'] })]]),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.policies?.size).toBe(0);
  });
});
