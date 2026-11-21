/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsSerializer, SavedObjectsRawDoc } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { CASE_OBSERVABLE_SHARED_SAVED_OBJECT } from '../../../common/constants';
import { ObservableSharedService, deriveSharedObservableId, metadataFilterQuery } from '.';

const user = { username: 'analyst', full_name: null, email: null };

const rawShared = ({
  id,
  metadata,
  value = '10.0.0.8',
  updatedAt = null,
}: {
  id: string;
  metadata: Record<string, string>;
  value?: string;
  updatedAt?: string | null;
}) => ({
  _index: '.kibana_alerting_cases',
  _id: `${CASE_OBSERVABLE_SHARED_SAVED_OBJECT}:${id}`,
  _seq_no: 1,
  _primary_term: 1,
  _source: {
    type: CASE_OBSERVABLE_SHARED_SAVED_OBJECT,
    namespaces: ['default'],
    references: [],
    [CASE_OBSERVABLE_SHARED_SAVED_OBJECT]: {
      owner: 'securitySolution',
      type_key: 'observable-type-ipv4',
      value,
      metadata,
      created_at: '2026-11-09T09:00:00.000Z',
      created_by: user,
      updated_at: updatedAt,
      updated_by: null,
    },
  },
});

const searchResponse = (hits: Array<ReturnType<typeof rawShared>>) => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, failed: 0, skipped: 0 },
  hits: { hits },
});

describe('ObservableSharedService', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const savedObjectsSerializer = {
    rawToSavedObject: jest.fn(({ _id, _source, _seq_no: seqNo }: SavedObjectsRawDoc) => ({
      id: _id.split(':').pop(),
      type: _source.type,
      version: seqNo != null ? `v${seqNo}` : undefined,
      references: _source.references,
      attributes: _source[_source.type],
    })),
  } as unknown as ISavedObjectsSerializer;

  const service = new ObservableSharedService({
    log: loggingSystemMock.createLogger(),
    unsecuredSavedObjectsClient,
    savedObjectsSerializer,
    namespace: 'space-1',
  });

  const write = (args: Partial<Parameters<typeof service.writeMetadata>[0]>) =>
    service.writeMetadata({
      owner: 'securitySolution',
      typeKey: 'observable-type-ipv4',
      value: '10.0.0.8',
      metadata: { triage: 'confirmed' },
      mode: 'replace',
      user,
      ...args,
    });

  beforeEach(() => {
    jest.resetAllMocks();
    (savedObjectsSerializer.rawToSavedObject as jest.Mock).mockImplementation(
      ({ _id, _source, _seq_no: seqNo }: SavedObjectsRawDoc) => ({
        id: _id.split(':').pop(),
        type: _source.type,
        version: seqNo != null ? `v${seqNo}` : undefined,
        references: _source.references,
        attributes: _source[_source.type],
      })
    );
  });

  describe('deriveSharedObservableId', () => {
    it('is stable for a value and differs by space and owner', () => {
      const base = { owner: 'securitySolution', typeKey: 'ipv4', value: '10.0.0.8' };
      const id = deriveSharedObservableId({ ...base, namespace: 'default' });

      expect(deriveSharedObservableId({ ...base, namespace: 'default' })).toBe(id);
      expect(deriveSharedObservableId({ ...base, namespace: 'space-1' })).not.toBe(id);
      expect(
        deriveSharedObservableId({ ...base, namespace: 'default', owner: 'observability' })
      ).not.toBe(id);
    });
  });

  describe('findByKeys', () => {
    it('finds shared objects by owner, type key and value, most recently updated first', async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValue(
        searchResponse([
          rawShared({
            id: 'newer',
            metadata: { triage: 'new' },
            updatedAt: '2026-11-09T10:00:00Z',
          }),
          rawShared({ id: 'older', metadata: { triage: 'old' } }),
        ])
      );

      const shared = await service.findByKeys('securitySolution', [
        { typeKey: 'observable-type-ipv4', value: '10.0.0.8' },
      ]);

      const [[request]] = unsecuredSavedObjectsClient.search.mock.calls;
      expect(request).toMatchObject({
        type: CASE_OBSERVABLE_SHARED_SAVED_OBJECT,
        namespaces: ['space-1'],
      });
      expect(JSON.stringify(request.query)).toContain(
        JSON.stringify({ term: { 'cases-observable-shared.owner': 'securitySolution' } })
      );
      expect(JSON.stringify(request.query)).toContain('cases-observable-shared.type_key');
      expect([...shared.values()].map(({ id }) => id)).toEqual(['newer']);
    });
  });

  describe('writeMetadata', () => {
    it('creates the shared object under the derived id on the first write', async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValue(searchResponse([]));
      unsecuredSavedObjectsClient.create.mockResolvedValue({
        id: 'derived',
        type: CASE_OBSERVABLE_SHARED_SAVED_OBJECT,
        attributes: {},
        references: [],
      });

      await write({});

      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
        CASE_OBSERVABLE_SHARED_SAVED_OBJECT,
        expect.objectContaining({ metadata: { triage: 'confirmed' }, value: '10.0.0.8' }),
        {
          id: deriveSharedObservableId({
            namespace: 'space-1',
            owner: 'securitySolution',
            typeKey: 'observable-type-ipv4',
            value: '10.0.0.8',
          }),
          overwrite: false,
          refresh: 'wait_for',
        }
      );
    });

    it('creates nothing when there is no metadata to store', async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValue(searchResponse([]));

      await write({ metadata: null });

      expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
    });

    it('merges into the stored metadata, keeping keys it does not name', async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValue(
        searchResponse([
          rawShared({ id: 'shared-1', metadata: { owner: 'payments', triage: 'new' } }),
        ])
      );
      unsecuredSavedObjectsClient.update.mockResolvedValue({
        id: 'shared-1',
        type: CASE_OBSERVABLE_SHARED_SAVED_OBJECT,
        attributes: {},
        references: [],
      });

      await write({ mode: 'merge' });

      expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
        CASE_OBSERVABLE_SHARED_SAVED_OBJECT,
        'shared-1',
        expect.objectContaining({ metadata: { owner: 'payments', triage: 'confirmed' } }),
        { version: 'v1', refresh: 'wait_for', mergeAttributes: false }
      );
    });

    it('replaces the stored metadata, and an empty object clears it', async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValue(
        searchResponse([rawShared({ id: 'shared-1', metadata: { owner: 'payments' } })])
      );
      unsecuredSavedObjectsClient.update.mockResolvedValue({
        id: 'shared-1',
        type: CASE_OBSERVABLE_SHARED_SAVED_OBJECT,
        attributes: {},
        references: [],
      });

      await write({ metadata: {} });

      expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
        CASE_OBSERVABLE_SHARED_SAVED_OBJECT,
        'shared-1',
        expect.objectContaining({ metadata: {} }),
        expect.objectContaining({ mergeAttributes: false })
      );
    });

    it('re-reads and retries when another writer created or changed the object first', async () => {
      unsecuredSavedObjectsClient.search
        .mockResolvedValueOnce(searchResponse([]))
        .mockResolvedValueOnce(
          searchResponse([rawShared({ id: 'shared-1', metadata: { a: '1' } })])
        );
      unsecuredSavedObjectsClient.create.mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError(CASE_OBSERVABLE_SHARED_SAVED_OBJECT, 'derived')
      );
      unsecuredSavedObjectsClient.update.mockResolvedValue({
        id: 'shared-1',
        type: CASE_OBSERVABLE_SHARED_SAVED_OBJECT,
        attributes: {},
        references: [],
      });

      await write({ mode: 'merge' });

      expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
        CASE_OBSERVABLE_SHARED_SAVED_OBJECT,
        'shared-1',
        expect.objectContaining({ metadata: { a: '1', triage: 'confirmed' } }),
        expect.anything()
      );
    });

    it('rejects a merge that would hold more than 20 pairs', async () => {
      const stored = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`key-${i}`, 'x']));
      unsecuredSavedObjectsClient.search.mockResolvedValue(
        searchResponse([rawShared({ id: 'shared-1', metadata: stored })])
      );

      await expect(write({ mode: 'merge', metadata: { extra: 'y' } })).rejects.toThrow(
        'at most 20 metadata pairs'
      );
      expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
    });
  });

  describe('metadata filters', () => {
    it('builds an exact match ignoring case, a prefix and a presence query', () => {
      expect(metadataFilterQuery({ key: 'triage', value: 'Confirmed' })).toEqual({
        term: {
          'cases-observable-shared.metadata.triage': { value: 'Confirmed', case_insensitive: true },
        },
      });
      expect(metadataFilterQuery({ key: 'owner', prefix: 'pay' })).toEqual({
        prefix: {
          'cases-observable-shared.metadata.owner': { value: 'pay', case_insensitive: true },
        },
      });
      expect(metadataFilterQuery({ key: 'triage' })).toEqual({
        exists: { field: 'cases-observable-shared.metadata.triage' },
      });
    });

    it('returns the type keys and values that match every filter, capped', async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValue(
        searchResponse([rawShared({ id: 'shared-1', metadata: { triage: 'confirmed' } })])
      );

      const keys = await service.findKeysByMetadata({
        owner: 'securitySolution',
        filters: [{ key: 'triage', value: 'confirmed' }, { key: 'owner' }],
        cap: 100,
      });

      const [[request]] = unsecuredSavedObjectsClient.search.mock.calls;
      expect(request.size).toBe(100);
      expect(request.query?.bool?.filter).toHaveLength(3);
      expect(keys).toEqual([{ typeKey: 'observable-type-ipv4', value: '10.0.0.8' }]);
    });
  });
});
