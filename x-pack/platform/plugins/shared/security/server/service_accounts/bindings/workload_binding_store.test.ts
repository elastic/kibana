/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';

import type { WorkloadBindingAttributes } from './binding_saved_object';
import {
  getWorkloadBindingId,
  SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
} from './binding_saved_object';
import { WorkloadBindingStore } from './workload_binding_store';

const COORDINATES = {
  operationType: 'alerting',
  workloadType: 'rule',
  workloadId: 'rule-id',
  spaceId: 'default',
};

const attributes = (
  overrides: Partial<WorkloadBindingAttributes> = {}
): WorkloadBindingAttributes => ({
  ...COORDINATES,
  serviceAccountId: 'service-account-id',
  attachedBy: { type: 'user', userProfileId: 'profile-uid', username: 'elastic' },
  attachedAt: '2026-08-21T00:00:00.000Z',
  canary: 'canary-value',
  ...overrides,
});

describe('WorkloadBindingStore', () => {
  let client: ReturnType<typeof savedObjectsClientMock.create>;
  let encryptedClient: ReturnType<typeof encryptedSavedObjectsMock.createClient>;
  let isEncryptionError: jest.Mock<boolean, [Error]>;
  let store: WorkloadBindingStore;

  beforeEach(() => {
    client = savedObjectsClientMock.create();
    encryptedClient = encryptedSavedObjectsMock.createClient();
    isEncryptionError = jest.fn().mockReturnValue(false);
    store = new WorkloadBindingStore({
      client,
      encryptedClient,
      isEncryptionError,
      logger: loggingSystemMock.create().get('workload-bindings'),
    });
  });

  describe('binding IDs', () => {
    it('are stable for the same coordinates and unique across each of them', () => {
      const id = getWorkloadBindingId(COORDINATES);

      expect(getWorkloadBindingId({ ...COORDINATES })).toBe(id);

      // Every coordinate participates in the identity, so no two workloads can collide.
      expect(getWorkloadBindingId({ ...COORDINATES, operationType: 'workflows' })).not.toBe(id);
      expect(getWorkloadBindingId({ ...COORDINATES, workloadType: 'backfill' })).not.toBe(id);
      expect(getWorkloadBindingId({ ...COORDINATES, workloadId: 'other-rule' })).not.toBe(id);
      expect(getWorkloadBindingId({ ...COORDINATES, spaceId: 'marketing' })).not.toBe(id);
    });

    it('are SHA-256 digests, which stays within what FIPS 140-3 approves', () => {
      expect(getWorkloadBindingId(COORDINATES)).toMatch(/^[0-9a-f]{64}$/);
    });

    it('cannot be made to collide by smuggling the separator into a coordinate', () => {
      expect(
        getWorkloadBindingId({ ...COORDINATES, operationType: 'alerting', workloadType: 'rule' })
      ).not.toBe(
        getWorkloadBindingId({ ...COORDINATES, operationType: 'alerting:rule', workloadType: '' })
      );
    });
  });

  describe('#set', () => {
    it('writes the whole document under the derived ID, replacing any existing binding', async () => {
      const written = attributes();
      const binding = await store.set(written);

      expect(client.create).toHaveBeenCalledWith(SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE, written, {
        id: getWorkloadBindingId(COORDINATES),
        overwrite: true,
        refresh: 'wait_for',
      });
      // Never `update`: a partial write would not re-derive the canary's authentication.
      expect(client.update).not.toHaveBeenCalled();

      expect(binding).toEqual({
        ...COORDINATES,
        serviceAccountId: 'service-account-id',
        attachedBy: { type: 'user', userProfileId: 'profile-uid', username: 'elastic' },
        attachedAt: '2026-08-21T00:00:00.000Z',
      });
      // The canary is an implementation detail of integrity and never surfaces to callers.
      expect(binding).not.toHaveProperty('canary');
    });
  });

  describe('#delete', () => {
    it('reports a removed binding', async () => {
      await expect(store.delete(COORDINATES)).resolves.toBe(true);
      expect(client.delete).toHaveBeenCalledWith(
        SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        getWorkloadBindingId(COORDINATES),
        { refresh: 'wait_for' }
      );
    });

    it('treats a missing binding as success, so detaching twice is not an error', async () => {
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
      await expect(store.delete(COORDINATES)).rejects.toThrowError('cluster unavailable');
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
        attachedBy: { type: 'user', userProfileId: 'profile-uid', username: 'elastic' },
        attachedAt: '2026-08-21T00:00:00.000Z',
      });

      expect(encryptedClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
        SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        getWorkloadBindingId(COORDINATES)
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

    it('fails closed when the stored document describes different coordinates', async () => {
      encryptedClient.getDecryptedAsInternalUser.mockResolvedValue({
        id: getWorkloadBindingId(COORDINATES),
        type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        references: [],
        attributes: attributes({ workloadId: 'a-different-rule' }),
      });

      await expect(store.getVerified(COORDINATES)).rejects.toMatchObject({
        message: 'The service account binding for this workload is inconsistent.',
        output: { statusCode: 403 },
      });
    });

    it('propagates unrelated failures rather than reporting "no binding"', async () => {
      encryptedClient.getDecryptedAsInternalUser.mockRejectedValue(
        new Error('cluster unavailable')
      );
      await expect(store.getVerified(COORDINATES)).rejects.toThrowError('cluster unavailable');
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
    });

    it('closes the finder even when a page fails', async () => {
      const close = jest.fn();
      client.createPointInTimeFinder.mockReturnValue({
        async *find() {
          throw new Error('search failed');
        },
        close,
      } as never);

      await expect(store.findByServiceAccountId('service-account-id')).rejects.toThrowError(
        'search failed'
      );
      expect(close).toHaveBeenCalledTimes(1);
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
