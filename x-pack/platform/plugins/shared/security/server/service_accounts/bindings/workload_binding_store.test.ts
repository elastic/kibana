/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import type { KueryNode } from '@kbn/es-query';
import { toKqlExpression } from '@kbn/es-query';
import type { MockedLogger } from '@kbn/logging-mocks';

import type { WorkloadBindingAttributes } from './binding_saved_object';
import {
  getWorkloadBindingId,
  SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
} from './binding_saved_object';
import { WorkloadBindingStore } from './workload_binding_store';

const COORDINATES = {
  pluginId: 'alerting',
  workloadType: 'rule',
  workloadId: 'rule-id',
  spaceId: 'default',
};

const attributes = (
  overrides: Partial<WorkloadBindingAttributes> = {}
): WorkloadBindingAttributes => ({
  ...COORDINATES,
  serviceAccountId: 'service-account-id',
  boundBy: { type: 'user', userProfileId: 'profile-uid', username: 'elastic' },
  boundAt: '2026-08-21T00:00:00.000Z',
  canary: 'canary-value',
  ...overrides,
});

describe('WorkloadBindingStore', () => {
  let client: ReturnType<typeof savedObjectsClientMock.create>;
  let encryptedClient: ReturnType<typeof encryptedSavedObjectsMock.createClient>;
  let isEncryptionError: jest.Mock<boolean, [Error]>;
  let logger: MockedLogger;
  let store: WorkloadBindingStore;

  beforeEach(() => {
    client = savedObjectsClientMock.create();
    encryptedClient = encryptedSavedObjectsMock.createClient();
    isEncryptionError = jest.fn().mockReturnValue(false);
    logger = loggingSystemMock.createLogger();
    store = new WorkloadBindingStore({
      client,
      encryptedClient,
      isEncryptionError,
      logger,
    });
  });

  describe('binding IDs', () => {
    it('are stable for the same coordinates and unique across each of them', () => {
      const id = getWorkloadBindingId(COORDINATES);

      expect(getWorkloadBindingId({ ...COORDINATES })).toBe(id);

      // Every coordinate participates in the identity, so no two workloads can collide.
      expect(getWorkloadBindingId({ ...COORDINATES, pluginId: 'workflows' })).not.toBe(id);
      expect(getWorkloadBindingId({ ...COORDINATES, workloadType: 'backfill' })).not.toBe(id);
      expect(getWorkloadBindingId({ ...COORDINATES, workloadId: 'other-rule' })).not.toBe(id);
      expect(getWorkloadBindingId({ ...COORDINATES, spaceId: 'marketing' })).not.toBe(id);
    });

    it('are SHA-256 digests, which stays within what FIPS 140-3 approves', () => {
      expect(getWorkloadBindingId(COORDINATES)).toMatch(/^[0-9a-f]{64}$/);
    });

    it('cannot be made to collide by smuggling the separator into a coordinate', () => {
      expect(
        getWorkloadBindingId({ ...COORDINATES, pluginId: 'alerting', workloadType: 'rule' })
      ).not.toBe(
        getWorkloadBindingId({ ...COORDINATES, pluginId: 'alerting:rule', workloadType: '' })
      );
    });
  });

  describe('#bulkSet', () => {
    const OTHER_COORDINATES = { ...COORDINATES, workloadId: 'other-rule-id' };

    beforeEach(() => {
      client.bulkCreate.mockImplementation(async (objects) => ({
        saved_objects: objects.map(({ type, id, attributes: written }) => ({
          type,
          id: id ?? '',
          attributes: written,
          references: [],
        })),
      }));
    });

    it('writes whole documents under their derived IDs in one request, replacing any existing bindings', async () => {
      const first = attributes();
      const second = attributes({ ...OTHER_COORDINATES, serviceAccountId: 'other-account-id' });

      const outcomes = await store.bulkSet([first, second]);

      expect(client.bulkCreate).toHaveBeenCalledTimes(1);
      expect(client.bulkCreate).toHaveBeenCalledWith(
        [
          {
            type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
            id: getWorkloadBindingId(COORDINATES),
            // The binding key is the saved object ID, so the cleanup can page in a stable order.
            attributes: { ...first, bindingKey: getWorkloadBindingId(COORDINATES) },
          },
          {
            type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
            id: getWorkloadBindingId(OTHER_COORDINATES),
            attributes: { ...second, bindingKey: getWorkloadBindingId(OTHER_COORDINATES) },
          },
        ],
        // The bindings live in the workloads' space, which is what retires them with that space.
        { namespace: 'default', overwrite: true, refresh: 'wait_for' }
      );
      // Never `update`: a partial write would not re-derive the canary's authentication.
      expect(client.update).not.toHaveBeenCalled();
      expect(client.bulkUpdate).not.toHaveBeenCalled();

      expect(outcomes).toEqual([
        {
          ok: true,
          value: {
            ...COORDINATES,
            serviceAccountId: 'service-account-id',
            boundBy: { type: 'user', userProfileId: 'profile-uid', username: 'elastic' },
            boundAt: '2026-08-21T00:00:00.000Z',
          },
        },
        {
          ok: true,
          value: expect.objectContaining({
            ...OTHER_COORDINATES,
            serviceAccountId: 'other-account-id',
          }),
        },
      ]);
      // The canary is an implementation detail of integrity and never surfaces to callers.
      expect(outcomes[0]).not.toHaveProperty('value.canary');
    });

    it('writes into the workloads’ own space, not the client’s', async () => {
      await store.bulkSet([attributes({ spaceId: 'marketing' })]);

      expect(client.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            attributes: expect.objectContaining({ spaceId: 'marketing' }),
          }),
        ],
        expect.objectContaining({ namespace: 'marketing' })
      );
    });

    it('reports a binding that could not be written without failing the others', async () => {
      client.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
            id: getWorkloadBindingId(COORDINATES),
            error: { error: 'Conflict', message: 'version conflict', statusCode: 409 },
          },
          {
            type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
            id: getWorkloadBindingId(OTHER_COORDINATES),
            attributes: attributes(OTHER_COORDINATES),
            references: [],
          },
        ],
      } as never);

      const [failed, written] = await store.bulkSet([attributes(), attributes(OTHER_COORDINATES)]);

      expect(failed).toMatchObject({
        ok: false,
        error: { message: 'version conflict', output: { statusCode: 409 } },
      });
      expect(written).toMatchObject({ ok: true, value: OTHER_COORDINATES });
    });

    it('keeps a per-item error the bulk API reports as the original error', async () => {
      // A failed create schema validation is reported as the error itself, not as its content.
      const invalid = SavedObjectsErrorHelpers.createBadRequestError('invalid attributes');
      client.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
            id: getWorkloadBindingId(COORDINATES),
            error: invalid,
          },
        ],
      } as never);

      const [outcome] = await store.bulkSet([attributes()]);

      if (outcome.ok) {
        throw new Error('Expected the write to fail.');
      }
      expect(outcome.error).toBe(invalid);
      expect(SavedObjectsErrorHelpers.isBadRequestError(outcome.error)).toBe(true);
      expect(outcome.error.output.statusCode).toBe(400);
    });

    it('refuses to write bindings of more than one space in one request', async () => {
      await expect(
        store.bulkSet([attributes(), attributes({ spaceId: 'marketing' })])
      ).rejects.toThrowError('A bulk write of workload bindings must address a single space.');
      expect(client.bulkCreate).not.toHaveBeenCalled();
    });

    it('sends nothing when there is nothing to write', async () => {
      await expect(store.bulkSet([])).resolves.toEqual([]);
      expect(client.bulkCreate).not.toHaveBeenCalled();
    });

    it('propagates a failure of the whole write', async () => {
      client.bulkCreate.mockRejectedValue(new Error('cluster unavailable'));
      await expect(store.bulkSet([attributes()])).rejects.toThrowError('cluster unavailable');
    });
  });

  describe('#bulkDelete', () => {
    const OTHER_COORDINATES = { ...COORDINATES, workloadId: 'other-rule-id' };
    const status = (
      coordinates: typeof COORDINATES,
      rest: { success: boolean; error?: { error: string; message: string; statusCode: number } }
    ) => ({
      type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
      id: getWorkloadBindingId(coordinates),
      ...rest,
    });

    it('removes the bindings in one request, from the workloads’ own space', async () => {
      const marketing = { ...COORDINATES, spaceId: 'marketing' };
      client.bulkDelete.mockResolvedValue({ statuses: [status(marketing, { success: true })] });

      await expect(store.bulkDelete([marketing])).resolves.toEqual([{ ok: true, value: true }]);
      expect(client.bulkDelete).toHaveBeenCalledWith(
        [{ type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE, id: getWorkloadBindingId(marketing) }],
        { namespace: 'marketing', refresh: 'wait_for' }
      );
    });

    it('treats a missing binding as removed, so unbinding twice is not an error', async () => {
      client.bulkDelete.mockResolvedValue({
        statuses: [
          status(COORDINATES, {
            success: false,
            error: { error: 'Not Found', message: 'Not found', statusCode: 404 },
          }),
          status(OTHER_COORDINATES, { success: true }),
        ],
      });

      await expect(store.bulkDelete([COORDINATES, OTHER_COORDINATES])).resolves.toEqual([
        { ok: true, value: false },
        { ok: true, value: true },
      ]);
    });

    it('reports any other failure for its binding alone', async () => {
      client.bulkDelete.mockResolvedValue({
        statuses: [
          status(COORDINATES, {
            success: false,
            error: { error: 'Service Unavailable', message: 'unavailable', statusCode: 503 },
          }),
          status(OTHER_COORDINATES, { success: true }),
        ],
      });

      const [failed, removed] = await store.bulkDelete([COORDINATES, OTHER_COORDINATES]);

      expect(failed).toMatchObject({
        ok: false,
        error: { message: 'unavailable', output: { statusCode: 503 } },
      });
      expect(removed).toEqual({ ok: true, value: true });
    });

    it('refuses to remove bindings of more than one space in one request', async () => {
      await expect(
        store.bulkDelete([COORDINATES, { ...COORDINATES, spaceId: 'marketing' }])
      ).rejects.toThrowError('A bulk write of workload bindings must address a single space.');
      expect(client.bulkDelete).not.toHaveBeenCalled();
    });

    it('sends nothing when there is nothing to remove', async () => {
      await expect(store.bulkDelete([])).resolves.toEqual([]);
      expect(client.bulkDelete).not.toHaveBeenCalled();
    });

    it('propagates a failure of the whole delete', async () => {
      client.bulkDelete.mockRejectedValue(new Error('cluster unavailable'));
      await expect(store.bulkDelete([COORDINATES])).rejects.toThrowError('cluster unavailable');
    });
  });

  describe('#delete', () => {
    it('reports a removed binding', async () => {
      await expect(store.delete(COORDINATES)).resolves.toBe(true);
      expect(client.delete).toHaveBeenCalledWith(
        SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        getWorkloadBindingId(COORDINATES),
        { namespace: 'default', refresh: 'wait_for' }
      );
    });

    it('removes the binding from the workload’s own space', async () => {
      const coordinates = { ...COORDINATES, spaceId: 'marketing' };
      await store.delete(coordinates);

      expect(client.delete).toHaveBeenCalledWith(
        SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        getWorkloadBindingId(coordinates),
        expect.objectContaining({ namespace: 'marketing' })
      );
    });

    it('treats a missing binding as success, so unbinding twice is not an error', async () => {
      client.delete.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
          'id'
        )
      );

      await expect(store.delete(COORDINATES)).resolves.toBe(false);
    });

    it('propagates any other failure', async () => {
      client.delete.mockRejectedValue(new Error('cluster unavailable'));
      await expect(store.delete(COORDINATES)).rejects.toThrow('cluster unavailable');
    });
  });

  describe('#getVerified', () => {
    it('returns the binding decrypted through the integrity-checking client', async () => {
      encryptedClient.getDecryptedAsInternalUser.mockResolvedValue({
        id: getWorkloadBindingId(COORDINATES),
        type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        references: [],
        attributes: attributes(),
      });

      await expect(store.getVerified(COORDINATES)).resolves.toEqual({
        ...COORDINATES,
        serviceAccountId: 'service-account-id',
        boundBy: { type: 'user', userProfileId: 'profile-uid', username: 'elastic' },
        boundAt: '2026-08-21T00:00:00.000Z',
      });

      expect(encryptedClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
        SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        getWorkloadBindingId(COORDINATES),
        { namespace: 'default' }
      );
    });

    it('returns null when the workload has no binding', async () => {
      encryptedClient.getDecryptedAsInternalUser.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
          'id'
        )
      );

      await expect(store.getVerified(COORDINATES)).resolves.toBeNull();
    });

    it('fails closed when the stored document no longer verifies', async () => {
      isEncryptionError.mockReturnValue(true);
      encryptedClient.getDecryptedAsInternalUser.mockRejectedValue(
        new Error('Unable to decrypt attribute "canary"')
      );

      await expect(store.getVerified(COORDINATES)).rejects.toMatchObject({
        message: 'The service account binding for this workload failed integrity verification.',
        output: { statusCode: 403 },
      });
    });

    it('fails closed when the stored document has no canary to verify', async () => {
      // Decryption skips an absent encrypted attribute instead of failing, so nothing else would
      // notice that the remaining attributes were never authenticated.
      const { canary, ...withoutCanary } = attributes({ serviceAccountId: 'attacker-chosen' });
      encryptedClient.getDecryptedAsInternalUser.mockResolvedValue({
        id: getWorkloadBindingId(COORDINATES),
        type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        references: [],
        attributes: withoutCanary as WorkloadBindingAttributes,
      });

      await expect(store.getVerified(COORDINATES)).rejects.toMatchObject({
        message: 'The service account binding for this workload failed integrity verification.',
        output: { statusCode: 403 },
      });
    });

    it('fails closed when the stored document has an empty canary', async () => {
      encryptedClient.getDecryptedAsInternalUser.mockResolvedValue({
        id: getWorkloadBindingId(COORDINATES),
        type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        references: [],
        attributes: attributes({ canary: '' }),
      });

      await expect(store.getVerified(COORDINATES)).rejects.toMatchObject({
        message: 'The service account binding for this workload failed integrity verification.',
        output: { statusCode: 403 },
      });
    });

    it('returns the binding when every coordinate matches', async () => {
      encryptedClient.getDecryptedAsInternalUser.mockResolvedValue({
        id: getWorkloadBindingId(COORDINATES),
        type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        references: [],
        attributes: attributes(),
      });

      await expect(store.getVerified(COORDINATES)).resolves.toEqual(
        expect.objectContaining({ ...COORDINATES, serviceAccountId: 'service-account-id' })
      );
      expect(logger.error).not.toHaveBeenCalled();
    });

    it.each(['pluginId', 'workloadType', 'workloadId', 'spaceId'] as const)(
      'fails closed when only the stored [%s] differs from the coordinates looked up',
      async (coordinate) => {
        encryptedClient.getDecryptedAsInternalUser.mockResolvedValue({
          id: getWorkloadBindingId(COORDINATES),
          type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
          references: [],
          attributes: attributes({ [coordinate]: 'something-else' }),
        });

        await expect(store.getVerified(COORDINATES)).rejects.toMatchObject({
          message: 'The service account binding for this workload is inconsistent.',
          output: { statusCode: 403 },
        });
        // Only the offending coordinate is reported, with both sides, so the log tells which one.
        expect(logger.error).toHaveBeenCalledWith(
          `Service account workload binding [${getWorkloadBindingId(
            COORDINATES
          )}] does not describe the workload it was looked up by: ${coordinate}: expected [${
            COORDINATES[coordinate]
          }], got [something-else]`
        );
      }
    );

    it('reports every mismatching coordinate when several differ', async () => {
      encryptedClient.getDecryptedAsInternalUser.mockResolvedValue({
        id: getWorkloadBindingId(COORDINATES),
        type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        references: [],
        attributes: attributes({ workloadId: 'a-different-rule', spaceId: 'marketing' }),
      });

      await expect(store.getVerified(COORDINATES)).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'workloadId: expected [rule-id], got [a-different-rule]; spaceId: expected [default], got [marketing]'
        )
      );
    });

    it('propagates unrelated failures rather than reporting "no binding"', async () => {
      encryptedClient.getDecryptedAsInternalUser.mockRejectedValue(
        new Error('cluster unavailable')
      );
      await expect(store.getVerified(COORDINATES)).rejects.toThrow('cluster unavailable');
    });
  });

  describe('#findByServiceAccountId', () => {
    it('walks every page of bindings for the service account and closes the finder', async () => {
      const close = mockFinder([
        [{ attributes: attributes() }, { attributes: attributes({ workloadId: 'second-rule' }) }],
        [{ attributes: attributes({ spaceId: 'marketing', workloadId: 'third-rule' }) }],
      ]);

      const bindings = await store.findByServiceAccountId('service-account-id');

      expect(bindings.map(({ workloadId, spaceId }) => ({ workloadId, spaceId }))).toEqual([
        { workloadId: 'rule-id', spaceId: 'default' },
        { workloadId: 'second-rule', spaceId: 'default' },
        { workloadId: 'third-rule', spaceId: 'marketing' },
      ]);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('filters on the service account, not the workload', async () => {
      mockFinder([]);
      await store.findByServiceAccountId('service-account-id');

      const [[findOptions]] = client.createPointInTimeFinder.mock.calls;
      expect(findOptions.type).toBe(SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE);
      expect(JSON.stringify(findOptions.filter)).toContain('serviceAccountId');
      // A service account is project-scoped, so its workloads are looked for in every space.
      expect(findOptions.namespaces).toEqual(['*']);
    });

    it('closes the finder even when a page fails', async () => {
      const close = jest.fn();
      client.createPointInTimeFinder.mockReturnValue({
        async *find() {
          throw new Error('search failed');
        },
        close,
      } as never);

      await expect(store.findByServiceAccountId('service-account-id')).rejects.toThrow(
        'search failed'
      );
      expect(close).toHaveBeenCalledTimes(1);
    });
  });

  describe('#findPageForSweep', () => {
    const findResponse = (objects: Array<Partial<WorkloadBindingAttributes>>) => ({
      saved_objects: objects.map((overrides) => ({
        id: 'id',
        type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        references: [],
        score: 0,
        attributes: attributes(overrides),
      })),
      total: objects.length,
      page: 1,
      per_page: objects.length,
    });
    const filterOf = () => toKqlExpression(client.find.mock.calls[0][0].filter as KueryNode);

    it('reads keyed bindings made before the cutoff, in binding key order, across all spaces', async () => {
      client.find.mockResolvedValue(findResponse([{ bindingKey: 'a' }, { bindingKey: 'b' }]));

      const { bindings, nextAfterKey } = await store.findPageForSweep({
        cutoff: '2026-10-25T00:00:00.000Z',
        size: 100,
      });

      expect(bindings).toEqual([
        expect.objectContaining(COORDINATES),
        expect.objectContaining(COORDINATES),
      ]);
      expect(nextAfterKey).toBe('b');
      // Neither the canary nor the key leaves the store on a binding.
      expect(bindings[0]).not.toHaveProperty('canary');
      expect(bindings[0]).not.toHaveProperty('bindingKey');
      expect(client.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
          perPage: 100,
          namespaces: ['*'],
          sortField: 'bindingKey',
          sortOrder: 'asc',
        })
      );
      expect(filterOf()).toBe(
        '(service-account-workload-binding.attributes.boundAt < 2026-10-25T00\\:00\\:00.000Z AND service-account-workload-binding.attributes.bindingKey: *)'
      );
    });

    it('starts after the given binding key', async () => {
      client.find.mockResolvedValue(findResponse([]));

      await expect(
        store.findPageForSweep({
          cutoff: '2026-10-25T00:00:00.000Z',
          afterKey: 'abc',
          size: 10,
        })
      ).resolves.toEqual({ bindings: [], nextAfterKey: undefined });

      expect(filterOf()).toContain('service-account-workload-binding.attributes.bindingKey > abc');
    });
  });

  describe('#findUnkeyedPage', () => {
    it('reads bindings made before the cutoff that have no binding key', async () => {
      client.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 0 });

      await expect(
        store.findUnkeyedPage({ cutoff: '2026-10-25T00:00:00.000Z', size: 100 })
      ).resolves.toEqual([]);

      expect(client.find).toHaveBeenCalledWith(
        expect.objectContaining({ perPage: 100, namespaces: ['*'], sortField: 'boundAt' })
      );
      expect(toKqlExpression(client.find.mock.calls[0][0].filter as KueryNode)).toBe(
        '(service-account-workload-binding.attributes.boundAt < 2026-10-25T00\\:00\\:00.000Z AND NOT service-account-workload-binding.attributes.bindingKey: *)'
      );
    });
  });

  describe('#setBindingKey', () => {
    it('writes only the binding key, in the binding’s own space', async () => {
      await expect(store.setBindingKey(COORDINATES)).resolves.toBe(true);

      expect(client.update).toHaveBeenCalledWith(
        SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        getWorkloadBindingId(COORDINATES),
        // Nothing encrypted or authenticated, so the canary still verifies afterwards.
        { bindingKey: getWorkloadBindingId(COORDINATES) },
        { namespace: 'default' }
      );
    });

    it('resolves false when the binding is gone', async () => {
      client.update.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
          'id'
        )
      );

      await expect(store.setBindingKey(COORDINATES)).resolves.toBe(false);
    });

    it('propagates other failures', async () => {
      client.update.mockRejectedValue(new Error('unavailable'));

      await expect(store.setBindingKey(COORDINATES)).rejects.toThrow('unavailable');
    });
  });

  describe('#verifyUnchanged', () => {
    const expected = {
      serviceAccountId: 'service-account-id',
      boundAt: '2026-08-21T00:00:00.000Z',
    };
    const stored = (overrides: Partial<WorkloadBindingAttributes> = {}) =>
      encryptedClient.getDecryptedAsInternalUser.mockResolvedValue({
        id: getWorkloadBindingId(COORDINATES),
        type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        references: [],
        attributes: attributes(overrides),
      });

    it('answers verified for the same account and bind time', async () => {
      stored();
      await expect(store.verifyUnchanged(COORDINATES, expected)).resolves.toBe('verified');
    });

    it.each([
      ['another account', { serviceAccountId: 'other-account' }],
      ['another bind time', { boundAt: '2026-10-25T00:00:00.000Z' }],
    ])('answers changed for %s', async (_, overrides) => {
      stored(overrides);
      await expect(store.verifyUnchanged(COORDINATES, expected)).resolves.toBe('changed');
    });

    it('answers absent when the binding is gone', async () => {
      encryptedClient.getDecryptedAsInternalUser.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
          'id'
        )
      );
      await expect(store.verifyUnchanged(COORDINATES, expected)).resolves.toBe('absent');
    });

    it('answers integrity_failed when the binding no longer verifies', async () => {
      isEncryptionError.mockReturnValue(true);
      encryptedClient.getDecryptedAsInternalUser.mockRejectedValue(new Error('cannot decrypt'));
      await expect(store.verifyUnchanged(COORDINATES, expected)).resolves.toBe('integrity_failed');
    });

    it('propagates other failures', async () => {
      encryptedClient.getDecryptedAsInternalUser.mockRejectedValue(new Error('unavailable'));
      await expect(store.verifyUnchanged(COORDINATES, expected)).rejects.toThrow('unavailable');
    });
  });

  describe('#countByServiceAccountIds', () => {
    const field = `${SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE}.attributes.serviceAccountId`;

    const mockBuckets = (buckets: Array<{ key: string; doc_count: number }>) =>
      client.find.mockResolvedValue({
        saved_objects: [],
        total: buckets.reduce((total, { doc_count: count }) => total + count, 0),
        page: 1,
        per_page: 0,
        aggregations: {
          byServiceAccount: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets,
          },
        },
      } as never);

    it('counts the bindings of each account with one aggregation across every space', async () => {
      mockBuckets([
        { key: 'first-account', doc_count: 3 },
        { key: 'second-account', doc_count: 1 },
      ]);

      const counts = await store.countByServiceAccountIds([
        'first-account',
        'second-account',
        'unbound-account',
      ]);

      expect(counts).toEqual(
        new Map([
          ['first-account', 3],
          ['second-account', 1],
        ])
      );
      expect(client.find).toHaveBeenCalledTimes(1);
      const [[findOptions]] = client.find.mock.calls;
      expect(findOptions).toMatchObject({
        type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        perPage: 0,
        namespaces: ['*'],
        aggs: {
          byServiceAccount: {
            terms: {
              field,
              include: ['first-account', 'second-account', 'unbound-account'],
              size: 3,
            },
          },
        },
      });
      const filter = JSON.stringify(findOptions.filter);
      expect(filter).toContain('first-account');
      expect(filter).toContain('unbound-account');
    });

    it('does not search when there are no accounts', async () => {
      expect(await store.countByServiceAccountIds([])).toEqual(new Map());
      expect(client.find).not.toHaveBeenCalled();
    });

    it('counts nothing when the search returns no aggregations', async () => {
      client.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 0,
      });

      expect(await store.countByServiceAccountIds(['first-account'])).toEqual(new Map());
    });

    it('propagates a failed search', async () => {
      client.find.mockRejectedValue(new Error('search failed'));

      await expect(store.countByServiceAccountIds(['first-account'])).rejects.toThrow(
        'search failed'
      );
    });
  });

  describe('#summarize', () => {
    const field = (attribute: string) =>
      `${SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE}.attributes.${attribute}`;

    const mockAggregations = (aggregations: Record<string, unknown>) =>
      client.find.mockResolvedValue({
        saved_objects: [],
        total: 10_000,
        page: 1,
        per_page: 0,
        aggregations,
      } as never);

    it('summarizes every binding with one aggregation across every space', async () => {
      mockAggregations({
        byPlugin: {
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'workflowsExecutionEngine',
              doc_count: 3,
              byWorkloadType: { buckets: [{ key: 'workflow', doc_count: 3 }] },
            },
            {
              key: 'alerting',
              doc_count: 2,
              byWorkloadType: {
                buckets: [
                  { key: 'rule', doc_count: 1 },
                  { key: 'action', doc_count: 1 },
                ],
              },
            },
          ],
        },
        byBinderType: {
          buckets: [
            { key: 'user', doc_count: 4 },
            { key: 'service_account', doc_count: 1 },
          ],
        },
        serviceAccounts: { value: 2 },
      });

      await expect(store.summarize()).resolves.toEqual({
        total: 5,
        serviceAccounts: 2,
        byWorkload: [
          { pluginId: 'workflowsExecutionEngine', workloadType: 'workflow', count: 3 },
          { pluginId: 'alerting', workloadType: 'rule', count: 1 },
          { pluginId: 'alerting', workloadType: 'action', count: 1 },
        ],
        byBinderType: { user: 4, api_key: 0, service_account: 1 },
      });
      expect(client.find).toHaveBeenCalledTimes(1);
      expect(client.find).toHaveBeenCalledWith({
        type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        perPage: 0,
        namespaces: ['*'],
        aggs: {
          byPlugin: {
            terms: { field: field('pluginId'), size: 100 },
            aggs: { byWorkloadType: { terms: { field: field('workloadType'), size: 100 } } },
          },
          byBinderType: { terms: { field: field('boundBy.type'), size: 100 } },
          serviceAccounts: {
            cardinality: { field: field('serviceAccountId'), precision_threshold: 40_000 },
          },
        },
      });
    });

    it('counts bindings outside the returned plugin buckets in the total', async () => {
      mockAggregations({
        byPlugin: {
          sum_other_doc_count: 7,
          buckets: [
            { key: 'workflowsExecutionEngine', doc_count: 3, byWorkloadType: { buckets: [] } },
          ],
        },
        byBinderType: { buckets: [] },
        serviceAccounts: { value: 1 },
      });

      const { total } = await store.summarize();
      expect(total).toBe(10);
    });

    it('ignores binder types it does not know', async () => {
      mockAggregations({
        byPlugin: { buckets: [] },
        byBinderType: { buckets: [{ key: 'something_new', doc_count: 1 }] },
        serviceAccounts: { value: 0 },
      });

      const { byBinderType } = await store.summarize();
      expect(byBinderType).toEqual({ user: 0, api_key: 0, service_account: 0 });
    });

    it('summarizes nothing when the search returns no aggregations', async () => {
      client.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 0 });

      await expect(store.summarize()).resolves.toEqual({
        total: 0,
        serviceAccounts: 0,
        byWorkload: [],
        byBinderType: { user: 0, api_key: 0, service_account: 0 },
      });
    });

    it('propagates a failed search', async () => {
      client.find.mockRejectedValue(new Error('search failed'));

      await expect(store.summarize()).rejects.toThrow('search failed');
    });
  });

  /** Stubs the point-in-time finder with the given pages; returns its `close` spy. */
  function mockFinder(pages: Array<Array<Partial<{ id: string; attributes: unknown }>>>) {
    const close = jest.fn();
    client.createPointInTimeFinder.mockReturnValue({
      async *find() {
        for (const page of pages) {
          yield { saved_objects: page };
        }
      },
      close,
    } as never);
    return close;
  }
});
