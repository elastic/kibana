/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicySavedObjectAttributes } from '../../../saved_objects';
import type {
  ActionPolicySavedObjectBulkGetItem,
  ActionPolicySavedObjectService,
} from '../../services/action_policy_saved_object_service/action_policy_saved_object_service';
import { createActionPolicySavedObjectService } from '../../services/action_policy_saved_object_service/action_policy_saved_object_service.mock';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { savedObjectNamespacesToSpaceId } from '../../space_id_to_namespace';
import {
  createAlert,
  createDispatcherPipelineState,
  createStepLogger,
} from '../fixtures/test_utils';
import { FetchPoliciesStep } from './fetch_policies_step';

const logger = createStepLogger();

const policyAttributes = (
  overrides: Partial<ActionPolicySavedObjectAttributes> = {}
): ActionPolicySavedObjectAttributes => ({
  name: 'Policy 1',
  description: 'Test',
  enabled: true,
  destinations: [{ type: 'workflow', id: 'w1' }],
  apiKey: 'decrypted-key',
  apiKeyOwner: 'elastic',
  apiKeyCreatedByUser: false,
  createdBy: null,
  updatedBy: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const policyDoc = (
  id: string,
  {
    version = 'v1',
    spaceId = 'default',
    ...attributes
  }: Partial<ActionPolicySavedObjectAttributes> & { version?: string; spaceId?: string } = {}
): ActionPolicySavedObjectBulkGetItem => ({
  id,
  version,
  namespaces: [spaceId],
  attributes: policyAttributes(attributes),
});

const decryptionError = (id: string): ActionPolicySavedObjectBulkGetItem => ({
  id,
  error: { statusCode: 500, message: 'Decryption failed', error: 'Error' },
});

describe('FetchPoliciesStep', () => {
  let npSoService: ActionPolicySavedObjectService;
  let mockFindAllDecrypted: ReturnType<
    typeof createActionPolicySavedObjectService
  >['mockFindAllDecrypted'];
  let mockFindAllVersions: ReturnType<
    typeof createActionPolicySavedObjectService
  >['mockFindAllVersions'];

  beforeEach(() => {
    ({
      actionPolicySavedObjectService: npSoService,
      mockFindAllDecrypted,
      mockFindAllVersions,
    } = createActionPolicySavedObjectService());
  });

  /**
   * Stores `docs`: the light fetch returns their versions and the decrypted fetch returns those in
   * the requested spaces. Error items stand for policies of the default space that fail to decrypt.
   */
  const givenStoredPolicies = (docs: ActionPolicySavedObjectBulkGetItem[]) => {
    const spaceOf = (doc: ActionPolicySavedObjectBulkGetItem) =>
      savedObjectNamespacesToSpaceId('namespaces' in doc ? doc.namespaces : undefined);

    mockFindAllVersions.mockResolvedValue(
      docs.map((doc) => ({
        id: doc.id,
        version: 'version' in doc ? doc.version : 'v1',
        namespaces: [spaceOf(doc)],
      }))
    );
    mockFindAllDecrypted.mockImplementation(async (params) =>
      docs.filter((doc) => params?.spaceIds?.includes(spaceOf(doc)))
    );
  };

  const buildStep = () => new FetchPoliciesStep(npSoService);
  const buildState = () =>
    createDispatcherPipelineState({
      dispatchable: [createAlert(), createAlert({ space_id: 'space-a', alert_id: 'alert-2' })],
    });

  it('maps the decrypted policies into the catalog', async () => {
    givenStoredPolicies([policyDoc('p1', { matcher: null, throttle: null })]);

    const result = await buildStep().execute(buildState(), logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.policies?.size).toBe(1);

    const policy = result.data?.policies?.get('p1');
    expect(policy?.name).toBe('Policy 1');
    expect(policy?.spaceId).toBe('default');
    expect(policy?.apiKey).toBe('decrypted-key');
    expect(policy?.matcher).toBeUndefined();
    expect(policy?.grouping).toEqual({ mode: 'per_alert' });
    expect(policy?.throttle).toBeUndefined();
    expect(policy?.snoozedUntil).toBeNull();
  });

  it('skips the lookup and returns an empty catalog when no alert is dispatchable', async () => {
    const result = await buildStep().execute(createDispatcherPipelineState(), logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.policies?.size).toBe(0);
    expect(mockFindAllVersions).not.toHaveBeenCalled();
    expect(mockFindAllDecrypted).not.toHaveBeenCalled();
  });

  it('reads policy versions only in the spaces of the dispatchable alerts', async () => {
    const state = createDispatcherPipelineState({
      dispatchable: [
        createAlert(),
        createAlert({ space_id: 'space-a', alert_id: 'alert-2' }),
        createAlert({ space_id: 'space-a', alert_id: 'alert-3' }),
      ],
    });

    await buildStep().execute(state, logger);

    expect(mockFindAllVersions).toHaveBeenCalledWith({
      filter: { enabled: true },
      spaceIds: ['default', 'space-a'],
    });
  });

  it('returns an empty catalog without decrypting when no policies exist', async () => {
    givenStoredPolicies([]);

    const result = await buildStep().execute(buildState(), logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.policies?.size).toBe(0);
    expect(mockFindAllDecrypted).not.toHaveBeenCalled();
  });

  it('skips documents with errors and warns', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    givenStoredPolicies([decryptionError('p1')]);

    const result = await buildStep().execute(buildState(), loggerService);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.policies?.size).toBe(0);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Action policy lookup failed',
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Decryption failed' }),
      })
    );
  });

  it('surfaces both clauses of a structured matcher', async () => {
    givenStoredPolicies([
      policyDoc('p-scoped', {
        name: 'Scoped',
        matcher: { tags: ['prod'], expression: 'data.severity: "critical"' },
      }),
    ]);

    const result = await buildStep().execute(buildState(), logger);

    if (result.type !== 'continue') throw new Error('expected continue');
    const policy = result.data?.policies?.get('p-scoped');
    expect(policy?.matcher).toEqual({ tags: ['prod'], expression: 'data.severity: "critical"' });
  });

  it('decrypts every space on the first tick', async () => {
    givenStoredPolicies([
      policyDoc('p1', { apiKey: 'key-1' }),
      policyDoc('p2', { apiKey: 'key-2', spaceId: 'space-a' }),
    ]);

    const result = await buildStep().execute(buildState(), logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.policies?.size).toBe(2);
    expect(result.data?.policies?.get('p1')?.apiKey).toBe('key-1');
    expect(result.data?.policies?.get('p2')?.apiKey).toBe('key-2');
    expect(mockFindAllDecrypted).toHaveBeenCalledTimes(1);
    expect(mockFindAllDecrypted).toHaveBeenCalledWith({
      filter: { enabled: true },
      spaceIds: ['default', 'space-a'],
    });
  });

  describe('across ticks', () => {
    it('reuses the decrypted policies when no version changed', async () => {
      const step = buildStep();
      givenStoredPolicies([policyDoc('p1'), policyDoc('p2', { spaceId: 'space-a' })]);

      const first = await step.execute(buildState(), logger);
      const second = await step.execute(buildState(), logger);

      expect(mockFindAllVersions).toHaveBeenCalledTimes(2);
      expect(mockFindAllDecrypted).toHaveBeenCalledTimes(1);
      if (first.type !== 'continue' || second.type !== 'continue') {
        throw new Error('expected continue');
      }
      expect(second.data?.policies?.size).toBe(2);
      expect(second.data?.policies?.get('p1')).toEqual(first.data?.policies?.get('p1'));
      expect(second.data?.policies?.get('p2')).toEqual(first.data?.policies?.get('p2'));
    });

    it('decrypts again only the space of a changed policy', async () => {
      const step = buildStep();
      givenStoredPolicies([
        policyDoc('p1', { apiKey: 'key-1' }),
        policyDoc('p2', { apiKey: 'key-2', spaceId: 'space-a' }),
      ]);
      await step.execute(buildState(), logger);

      givenStoredPolicies([
        policyDoc('p1', { apiKey: 'key-1' }),
        policyDoc('p2', { apiKey: 'rotated-key', spaceId: 'space-a', version: 'v2' }),
      ]);
      const result = await step.execute(buildState(), logger);

      expect(mockFindAllDecrypted).toHaveBeenLastCalledWith({
        filter: { enabled: true },
        spaceIds: ['space-a'],
      });
      if (result.type !== 'continue') throw new Error('expected continue');
      expect(result.data?.policies?.get('p1')?.apiKey).toBe('key-1');
      expect(result.data?.policies?.get('p2')?.apiKey).toBe('rotated-key');
    });

    it('drops a policy that is no longer returned', async () => {
      const step = buildStep();
      givenStoredPolicies([policyDoc('p1'), policyDoc('p2')]);
      await step.execute(buildState(), logger);

      givenStoredPolicies([policyDoc('p1')]);
      const result = await step.execute(buildState(), logger);

      expect(mockFindAllDecrypted).toHaveBeenCalledTimes(1);
      if (result.type !== 'continue') throw new Error('expected continue');
      expect(result.data?.policies?.size).toBe(1);
      expect(result.data?.policies?.get('p2')).toBeUndefined();
    });

    it('decrypts again a space whose policy failed to decrypt', async () => {
      const step = buildStep();
      givenStoredPolicies([policyDoc('p1'), decryptionError('p2')]);

      await step.execute(buildState(), logger);
      await step.execute(buildState(), logger);

      expect(mockFindAllDecrypted).toHaveBeenCalledTimes(2);
      expect(mockFindAllDecrypted).toHaveBeenLastCalledWith({
        filter: { enabled: true },
        spaceIds: ['default'],
      });
    });

    it('leaves the cache untouched when decryption throws', async () => {
      const step = buildStep();
      givenStoredPolicies([policyDoc('p1')]);
      mockFindAllDecrypted.mockRejectedValueOnce(new Error('boom'));

      await expect(step.execute(buildState(), logger)).rejects.toThrow('boom');
      const result = await step.execute(buildState(), logger);

      expect(mockFindAllDecrypted).toHaveBeenCalledTimes(2);
      if (result.type !== 'continue') throw new Error('expected continue');
      expect(result.data?.policies?.get('p1')?.apiKey).toBe('decrypted-key');
    });
  });
});
