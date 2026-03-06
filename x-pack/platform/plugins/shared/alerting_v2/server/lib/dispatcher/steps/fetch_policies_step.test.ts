/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { NotificationPolicySavedObjectAttributes } from '../../../saved_objects';
import { NOTIFICATION_POLICY_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { createDispatcherPipelineState, createRule } from '../fixtures/test_utils';
import { FetchPoliciesStep } from './fetch_policies_step';

const createPolicySavedObject = (
  id: string,
  overrides: Partial<NotificationPolicySavedObjectAttributes> = {}
): SavedObject<NotificationPolicySavedObjectAttributes> => ({
  id,
  type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
  attributes: {
    name: `Policy ${id}`,
    description: 'Test',
    destinations: [{ type: 'workflow' as const, id: 'w1' }],
    auth: { apiKey: `key-${id}`, owner: 'elastic', createdByUser: false },
    createdBy: null,
    updatedBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  },
  references: [],
});

const createMockFinder = (
  savedObjects: Array<SavedObject<NotificationPolicySavedObjectAttributes>>
) => ({
  find: jest.fn().mockImplementation(async function* () {
    yield { saved_objects: savedObjects };
  }),
  close: jest.fn(),
});

const createMockEncryptedSavedObjectsClient = (): jest.Mocked<EncryptedSavedObjectsClient> =>
  ({
    createPointInTimeFinderDecryptedAsInternalUser: jest.fn(),
  } as unknown as jest.Mocked<EncryptedSavedObjectsClient>);

describe('FetchPoliciesStep', () => {
  let mockEsoClient: jest.Mocked<EncryptedSavedObjectsClient>;

  beforeEach(() => {
    mockEsoClient = createMockEncryptedSavedObjectsClient();
  });

  it('fetches and decrypts unique policies via PIT finder', async () => {
    const mockFinderInstance = createMockFinder([createPolicySavedObject('p1')]);
    mockEsoClient.createPointInTimeFinderDecryptedAsInternalUser.mockResolvedValue(
      mockFinderInstance as any
    );

    const step = new FetchPoliciesStep(mockEsoClient);
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

    const policy = result.data?.policies?.get('p1');
    expect(policy?.name).toBe('Policy p1');
    expect(policy?.apiKey).toBe('key-p1');

    expect(mockEsoClient.createPointInTimeFinderDecryptedAsInternalUser).toHaveBeenCalledTimes(1);
    expect(mockEsoClient.createPointInTimeFinderDecryptedAsInternalUser).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        filter: expect.anything(),
      })
    );
    expect(mockFinderInstance.close).toHaveBeenCalled();
  });

  it('returns empty map when rules is empty', async () => {
    const step = new FetchPoliciesStep(mockEsoClient);

    const state = createDispatcherPipelineState({ rules: new Map() });
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.policies?.size).toBe(0);
    expect(mockEsoClient.createPointInTimeFinderDecryptedAsInternalUser).not.toHaveBeenCalled();
  });

  it('returns empty map when rules have no policy IDs', async () => {
    const step = new FetchPoliciesStep(mockEsoClient);

    const state = createDispatcherPipelineState({
      rules: new Map([['r1', createRule({ id: 'r1', notificationPolicyIds: [] })]]),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.policies?.size).toBe(0);
    expect(mockEsoClient.createPointInTimeFinderDecryptedAsInternalUser).not.toHaveBeenCalled();
  });

  it('skips saved objects with errors', async () => {
    const errorSo = {
      ...createPolicySavedObject('p1'),
      error: { statusCode: 500, message: 'Decryption failed', error: 'Internal Server Error' },
    };
    const mockFinderInstance = createMockFinder([errorSo as any]);
    mockEsoClient.createPointInTimeFinderDecryptedAsInternalUser.mockResolvedValue(
      mockFinderInstance as any
    );

    const step = new FetchPoliciesStep(mockEsoClient);
    const state = createDispatcherPipelineState({
      rules: new Map([['r1', createRule({ id: 'r1', notificationPolicyIds: ['p1'] })]]),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.policies?.size).toBe(0);
  });

  it('fetches multiple policies in a single PIT query', async () => {
    const mockFinderInstance = createMockFinder([
      createPolicySavedObject('p1'),
      createPolicySavedObject('p2'),
    ]);
    mockEsoClient.createPointInTimeFinderDecryptedAsInternalUser.mockResolvedValue(
      mockFinderInstance as any
    );

    const step = new FetchPoliciesStep(mockEsoClient);
    const state = createDispatcherPipelineState({
      rules: new Map([
        ['r1', createRule({ id: 'r1', notificationPolicyIds: ['p1'] })],
        ['r2', createRule({ id: 'r2', notificationPolicyIds: ['p2'] })],
      ]),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.policies?.size).toBe(2);
    expect(result.data?.policies?.get('p1')?.apiKey).toBe('key-p1');
    expect(result.data?.policies?.get('p2')?.apiKey).toBe('key-p2');
    expect(mockEsoClient.createPointInTimeFinderDecryptedAsInternalUser).toHaveBeenCalledTimes(1);
    expect(mockFinderInstance.close).toHaveBeenCalled();
  });
});
