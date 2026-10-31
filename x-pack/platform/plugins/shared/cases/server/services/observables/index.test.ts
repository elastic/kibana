/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { DiagnosticResult } from '@elastic/transport';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { Observable } from '../../../common/types/domain';
import { createObservablesStorageClientMock } from '../mocks';
import { ObservablesService } from '.';
import { generateObservableDocumentId } from './observable_id';

describe('ObservablesService', () => {
  const caseId = 'case-1';
  const spaceId = 'default';
  const owner = 'securitySolution';

  const observable: Observable = {
    id: 'legacy-1',
    typeKey: 'type-1',
    value: '1.1.1.1',
    description: 'first',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
  };
  const observableId = generateObservableDocumentId({ spaceId, caseId, ...observable });

  const bulkError = (status: number) => ({
    errors: true,
    items: [{ create: { status, error: { type: 'some_error', reason: 'boom' } } }],
  });

  let storageClient: ReturnType<typeof createObservablesStorageClientMock>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let service: ObservablesService;

  beforeEach(() => {
    storageClient = createObservablesStorageClientMock();
    logger = loggingSystemMock.createLogger();
    service = new ObservablesService({ storageClient, logger });
  });

  describe('createObservables', () => {
    it('writes one create-only document per observable with the ids callers know in legacy_id', async () => {
      await service.createObservables({
        caseId,
        spaceId,
        owner,
        observables: [observable],
        source: 'api',
      });

      expect(storageClient.bulk).toHaveBeenCalledTimes(1);
      expect(storageClient.bulk).toHaveBeenCalledWith({
        operations: [
          {
            create: {
              _id: observableId,
              document: {
                case_id: caseId,
                space_id: spaceId,
                owner,
                type_key: 'type-1',
                value: '1.1.1.1',
                description: 'first',
                legacy_id: 'legacy-1',
                source: 'api',
                created_at: '2026-01-01T00:00:00.000Z',
                updated_at: '2026-01-01T00:00:00.000Z',
              },
            },
          },
        ],
      });
    });

    it('omits an empty or null description', async () => {
      await service.createObservables({
        caseId,
        spaceId,
        owner,
        observables: [
          { ...observable, description: null },
          { ...observable, value: '2.2.2.2', description: '' },
        ],
        source: 'api',
      });

      const [{ operations }] = storageClient.bulk.mock.calls[0];
      operations.forEach((operation) =>
        expect((operation as { create: { document: object } }).create.document).not.toHaveProperty(
          'description'
        )
      );
    });

    it('does not call Elasticsearch when there is nothing to write', async () => {
      await service.createObservables({ caseId, spaceId, owner, observables: [], source: 'api' });

      expect(storageClient.bulk).not.toHaveBeenCalled();
    });

    it('treats an existing document (409) as success because the id is deterministic', async () => {
      storageClient.bulk.mockResolvedValue(bulkError(409) as never);

      await expect(
        service.createObservables({
          caseId,
          spaceId,
          owner,
          observables: [observable],
          source: 'api',
        })
      ).resolves.toBeUndefined();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    // Failure scenario: Elasticsearch rejects the write (for example missing index privileges), so the
    // caller must be told in order to flag the case as out of sync.
    it('throws and logs when a document fails for a reason other than a conflict', async () => {
      storageClient.bulk.mockResolvedValue(bulkError(403) as never);

      await expect(
        service.createObservables({
          caseId,
          spaceId,
          owner,
          observables: [observable],
          source: 'api',
        })
      ).rejects.toThrow('Failed to write 1 observables to the observables index: boom');
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to write 1 of 1 observables of case case-1 to the observables index'
      );
    });

    it('propagates a rejected bulk request', async () => {
      storageClient.bulk.mockRejectedValue(new Error('connection refused'));

      await expect(
        service.createObservables({
          caseId,
          spaceId,
          owner,
          observables: [observable],
          source: 'api',
        })
      ).rejects.toThrow('connection refused');
    });
  });

  describe('deleteObservables', () => {
    it('deletes by the deterministic id', async () => {
      await service.deleteObservables({ caseId, spaceId, observables: [observable] });

      expect(storageClient.bulk).toHaveBeenCalledWith({
        operations: [{ delete: { _id: observableId } }],
      });
    });

    it('does not call Elasticsearch when there is nothing to delete', async () => {
      await service.deleteObservables({ caseId, spaceId, observables: [] });

      expect(storageClient.bulk).not.toHaveBeenCalled();
    });

    it('treats a missing document (404) as success', async () => {
      storageClient.bulk.mockResolvedValue({
        errors: true,
        items: [{ delete: { status: 404, error: { type: 'not_found', reason: 'gone' } } }],
      } as never);

      await expect(
        service.deleteObservables({ caseId, spaceId, observables: [observable] })
      ).resolves.toBeUndefined();
    });

    it('throws when a delete fails for another reason', async () => {
      storageClient.bulk.mockResolvedValue({
        errors: true,
        items: [{ delete: { status: 500, error: { type: 'boom', reason: 'shard failure' } } }],
      } as never);

      await expect(
        service.deleteObservables({ caseId, spaceId, observables: [observable] })
      ).rejects.toThrow('shard failure');
    });
  });

  describe('updateObservable', () => {
    it('creates the new document and deletes the old one when the value changes', async () => {
      const next = { ...observable, value: '2.2.2.2' };
      const nextId = generateObservableDocumentId({ spaceId, caseId, ...next });

      await service.updateObservable({
        caseId,
        spaceId,
        owner,
        previous: observable,
        next,
        source: 'api',
      });

      expect(storageClient.bulk).toHaveBeenCalledTimes(2);
      expect(storageClient.bulk).toHaveBeenNthCalledWith(1, {
        operations: [
          {
            create: {
              _id: nextId,
              document: expect.objectContaining({ value: '2.2.2.2', legacy_id: 'legacy-1' }),
            },
          },
        ],
      });
      expect(storageClient.bulk).toHaveBeenNthCalledWith(2, {
        operations: [{ delete: { _id: observableId } }],
      });
    });

    it('does not delete the old document when creating the new one fails', async () => {
      storageClient.bulk.mockResolvedValueOnce(bulkError(500) as never);

      await expect(
        service.updateObservable({
          caseId,
          spaceId,
          owner,
          previous: observable,
          next: { ...observable, value: '2.2.2.2' },
          source: 'api',
        })
      ).rejects.toThrow('boom');
      expect(storageClient.bulk).toHaveBeenCalledTimes(1);
    });

    it('rewrites the same document and keeps its original source when only the description changes', async () => {
      storageClient.get.mockResolvedValue({ _source: { source: 'auto_extract' } } as never);

      await service.updateObservable({
        caseId,
        spaceId,
        owner,
        previous: observable,
        next: { ...observable, description: 'edited', updatedAt: '2026-02-01T00:00:00.000Z' },
        source: 'api',
      });

      expect(storageClient.get).toHaveBeenCalledWith({ id: observableId });
      expect(storageClient.bulk).toHaveBeenCalledWith({
        operations: [
          {
            index: {
              _id: observableId,
              document: expect.objectContaining({
                description: 'edited',
                source: 'auto_extract',
                updated_at: '2026-02-01T00:00:00.000Z',
              }),
            },
          },
        ],
      });
    });

    // Failure scenario: the index is behind the case and never received this observable.
    it('falls back to the given source when the existing document is missing', async () => {
      storageClient.get.mockRejectedValue({ meta: { statusCode: 404 } });

      await service.updateObservable({
        caseId,
        spaceId,
        owner,
        previous: observable,
        next: { ...observable, description: 'edited' },
        source: 'workflow',
      });

      expect(storageClient.bulk).toHaveBeenCalledWith({
        operations: [
          {
            index: { _id: observableId, document: expect.objectContaining({ source: 'workflow' }) },
          },
        ],
      });
    });

    // The adapter's `get` throws this exact ResponseError shape when no document matches, which is
    // also what the very first edit after deployment sees: the index does not exist yet.
    it('falls back to the given source when the adapter reports a missing document', async () => {
      storageClient.get.mockRejectedValue(
        new errors.ResponseError({
          meta: {
            aborted: false,
            attempts: 1,
            connection: null,
            context: null,
            name: 'resource_not_found_exception',
            request: {} as unknown as DiagnosticResult['meta']['request'],
          },
          warnings: [],
          body: 'resource_not_found_exception',
          statusCode: 404,
        })
      );

      await service.updateObservable({
        caseId,
        spaceId,
        owner,
        previous: observable,
        next: { ...observable, description: 'edited' },
        source: 'agent',
      });

      expect(storageClient.bulk).toHaveBeenCalledWith({
        operations: [
          { index: { _id: observableId, document: expect.objectContaining({ source: 'agent' }) } },
        ],
      });
    });

    it('propagates a lookup failure that is not a 404 without writing', async () => {
      storageClient.get.mockRejectedValue({ meta: { statusCode: 503 } });

      await expect(
        service.updateObservable({
          caseId,
          spaceId,
          owner,
          previous: observable,
          next: { ...observable, description: 'edited' },
          source: 'api',
        })
      ).rejects.toEqual({ meta: { statusCode: 503 } });
      expect(storageClient.bulk).not.toHaveBeenCalled();
    });
  });
});
