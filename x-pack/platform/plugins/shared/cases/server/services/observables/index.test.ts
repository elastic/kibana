/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { serializerMock } from '@kbn/core-saved-objects-base-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { CASE_OBSERVABLE_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import { CASE_REF_NAME } from '../../common/constants';
import type { ObservableToCreate } from '.';
import { ObservableService } from '.';
import {
  attributes,
  bulkResponse,
  CASE_ID,
  errorResult,
  NAMESPACE,
  savedObject,
  user,
} from './test_utils';

const toCreate = (index: number): ObservableToCreate => ({
  id: `observable-${index}`,
  typeKey: 'observable-type-ipv4',
  value: `10.0.0.${index}`,
  description: null,
  createdAt: '2026-11-06T09:30:00.000Z',
});

describe('ObservableService', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const savedObjectsSerializer = serializerMock.create();
  const log = loggerMock.create();
  let service: ObservableService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new ObservableService({
      log,
      unsecuredSavedObjectsClient,
      savedObjectsSerializer,
      namespace: NAMESPACE,
    });
  });

  it("reads through its getter in the request's space", async () => {
    unsecuredSavedObjectsClient.search.mockResolvedValueOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 3, relation: 'eq' }, hits: [] },
    });

    await expect(service.getter.countForCase(CASE_ID)).resolves.toBe(3);
    expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ type: CASE_OBSERVABLE_SAVED_OBJECT, namespaces: [NAMESPACE] })
    );
  });

  describe('bulkCreate', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.bulkCreate.mockImplementation(async (objects) => ({
        saved_objects: objects.map(({ id, type, attributes: attrs, references }) => ({
          id: id ?? '',
          type,
          attributes: attrs,
          references: references ?? [],
        })),
      }));
    });

    it('writes each observable under its id, referencing the case', async () => {
      const result = await service.bulkCreate({
        caseId: CASE_ID,
        owner: 'securitySolution',
        observables: [{ ...toCreate(1), description: 'from an alert' }],
        user,
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          {
            type: CASE_OBSERVABLE_SAVED_OBJECT,
            id: 'observable-1',
            attributes: attributes({ value: '10.0.0.1', description: 'from an alert' }),
            references: [{ type: CASE_SAVED_OBJECT, name: CASE_REF_NAME, id: CASE_ID }],
          },
        ],
        { refresh: 'wait_for' }
      );
      expect(result).toEqual([
        {
          id: 'observable-1',
          typeKey: 'observable-type-ipv4',
          value: '10.0.0.1',
          description: 'from an alert',
          createdAt: '2026-11-06T09:30:00.000Z',
          updatedAt: null,
        },
      ]);
      expect(log.debug).toHaveBeenCalledWith(
        'Attempting to bulk create 1 observables on case case-1'
      );
    });

    it('writes at most 1,000 objects per request and waits for the refresh after the last', async () => {
      const observables = Array.from({ length: 1_001 }, (_, index) => toCreate(index));

      const result = await service.bulkCreate({
        caseId: CASE_ID,
        owner: 'securitySolution',
        observables,
        user,
      });

      const { calls } = unsecuredSavedObjectsClient.bulkCreate.mock;
      expect(calls).toHaveLength(2);
      expect(calls[0][0]).toHaveLength(1_000);
      expect(calls[0][1]).toEqual({ refresh: false });
      expect(calls[1][0]).toHaveLength(1);
      expect(calls[1][1]).toEqual({ refresh: 'wait_for' });
      expect(result.map(({ id }) => id)).toEqual(observables.map(({ id }) => id));
    });

    it('counts an id an earlier attempt already created (409) as created', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(
        bulkResponse([errorResult('observable-1', 409, 'Saved object conflict')])
      );

      const result = await service.bulkCreate({
        caseId: CASE_ID,
        owner: 'securitySolution',
        observables: [toCreate(1)],
        user,
      });

      expect(result.map(({ id }) => id)).toEqual(['observable-1']);
    });

    /**
     * FAILURE SCENARIO: Observable objects fail to index
     * Symptom: The request that adds observables fails with a 500
     * Log signature: `Failed to bulk create 2 observables on case case-1: Error: Failed to create 1 observables`
     * Trigger: Elasticsearch rejects one object of the bulk create (anything but a 409)
     * Recovery: The caller retries with the same ids; objects already created count as created
     */
    it('throws and logs an error when an object fails with anything but a 409', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(
        bulkResponse([
          savedObject('observable-1'),
          errorResult('observable-2', 400, 'mapper_parsing_exception'),
        ])
      );

      await expect(
        service.bulkCreate({
          caseId: CASE_ID,
          owner: 'securitySolution',
          observables: [toCreate(1), toCreate(2)],
          user,
        })
      ).rejects.toThrow('Failed to create 1 observables: observable-2: mapper_parsing_exception');

      expect(log.error).toHaveBeenCalledTimes(1);
      const [message, meta] = log.error.mock.calls[0];
      expect(message).toBe(
        'Failed to bulk create 2 observables on case case-1: Error: Failed to create 1 observables: observable-2: mapper_parsing_exception'
      );
      expect(Boom.isBoom(meta?.error)).toBe(true);
    });
  });

  describe('update', () => {
    it('updates the object with its version and waits for the refresh', async () => {
      await service.update({
        observable: { ...savedObject('observable-1'), version: 'WzEsMV0=' },
        attributes: { value: '10.0.0.9', updated_at: '2026-11-07T09:30:00.000Z' },
      });

      expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
        CASE_OBSERVABLE_SAVED_OBJECT,
        'observable-1',
        { value: '10.0.0.9', updated_at: '2026-11-07T09:30:00.000Z' },
        { version: 'WzEsMV0=', refresh: 'wait_for' }
      );
    });

    /**
     * FAILURE SCENARIO: Concurrent edit of one observable
     * Symptom: The edit request fails with a 409
     * Log signature: `Failed to update observable observable-1: Error: conflict`
     * Trigger: The object changed after the caller read its version
     * Recovery: The caller re-reads the observable and retries
     */
    it('rethrows a conflict and logs it', async () => {
      const conflict = Boom.conflict('conflict');
      unsecuredSavedObjectsClient.update.mockRejectedValueOnce(conflict);

      await expect(
        service.update({
          observable: { ...savedObject('observable-1'), version: 'v1' },
          attributes: { value: 'x' },
        })
      ).rejects.toBe(conflict);
      expect(log.error).toHaveBeenCalledWith(
        'Failed to update observable observable-1: Error: conflict',
        { error: conflict }
      );
    });
  });

  describe('bulkDelete', () => {
    it('does not call Elasticsearch with nothing to delete', async () => {
      await expect(service.bulkDelete([])).resolves.toBeUndefined();
      expect(unsecuredSavedObjectsClient.bulkDelete).not.toHaveBeenCalled();
    });

    it('deletes by id and ignores ids that are already gone', async () => {
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'observable-1', type: CASE_OBSERVABLE_SAVED_OBJECT, success: true },
          { ...errorResult('observable-2', 404, 'Not found'), success: false },
        ],
      });

      await service.bulkDelete([savedObject('observable-1'), savedObject('observable-2')]);

      expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledWith(
        [
          { type: CASE_OBSERVABLE_SAVED_OBJECT, id: 'observable-1' },
          { type: CASE_OBSERVABLE_SAVED_OBJECT, id: 'observable-2' },
        ],
        { refresh: 'wait_for' }
      );
    });

    /**
     * FAILURE SCENARIO: Observable delete fails
     * Symptom: The delete request fails with a 500 and the observable is still listed
     * Log signature: `Failed to delete 1 observables: Error: Failed to delete 1 observables: observable-1: es down`
     * Trigger: The bulk delete reports a per-object failure other than 404
     * Recovery: Retrying the delete; already-deleted ids are ignored
     */
    it('throws when an id fails to delete for a reason other than not found', async () => {
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [{ ...errorResult('observable-1', 500, 'es down'), success: false }],
      });

      await expect(service.bulkDelete([savedObject('observable-1')])).rejects.toThrow(
        'Failed to delete 1 observables: observable-1: es down'
      );
    });
  });
});
