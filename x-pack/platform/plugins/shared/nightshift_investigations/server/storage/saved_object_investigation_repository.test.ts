/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { NIGHTSHIFT_INVESTIGATION_SO_TYPE } from '../saved_objects';
import { InvestigationAlreadyExistsError, InvestigationStaleWriteError } from './errors';
import {
  SavedObjectInvestigationRepository,
  type InvestigationSavedObjectsClient,
} from './saved_object_investigation_repository';
import type { InvestigationAttributes } from './types';

const TYPE = NIGHTSHIFT_INVESTIGATION_SO_TYPE;

const attributes: InvestigationAttributes = {
  status: 'running',
  subject_type: 'alert',
  subject_id: 'alert-1',
  trigger_type: 'manual',
  created_at: '2024-01-01T00:00:00Z',
};

const savedObject = {
  id: 'inv-1',
  type: TYPE,
  references: [],
  version: 'WzEsMV0=',
  score: 0,
  attributes,
};

const createRepository = () => {
  const savedObjectsClient: jest.Mocked<InvestigationSavedObjectsClient> = {
    create: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
  };
  return {
    repository: new SavedObjectInvestigationRepository({ savedObjectsClient }),
    savedObjectsClient,
  };
};

describe('SavedObjectInvestigationRepository', () => {
  describe('create()', () => {
    it('creates the saved object with the given id', async () => {
      const { repository, savedObjectsClient } = createRepository();

      await repository.create({ id: 'inv-1', attributes });

      expect(savedObjectsClient.create).toHaveBeenCalledWith(TYPE, attributes, { id: 'inv-1' });
    });

    it('maps a conflict to InvestigationAlreadyExistsError', async () => {
      const { repository, savedObjectsClient } = createRepository();
      savedObjectsClient.create.mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError(TYPE, 'inv-1')
      );

      await expect(repository.create({ id: 'inv-1', attributes })).rejects.toThrow(
        InvestigationAlreadyExistsError
      );
    });
  });

  describe('get()', () => {
    it('returns the mapped record', async () => {
      const { repository, savedObjectsClient } = createRepository();
      savedObjectsClient.get.mockResolvedValue(savedObject);

      await expect(repository.get('inv-1')).resolves.toEqual({
        id: 'inv-1',
        version: 'WzEsMV0=',
        ...attributes,
      });
    });

    it('returns undefined when the saved object is missing', async () => {
      const { repository, savedObjectsClient } = createRepository();
      savedObjectsClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(TYPE, 'inv-missing')
      );

      await expect(repository.get('inv-missing')).resolves.toBeUndefined();
    });
  });

  describe('update()', () => {
    it('writes the patch with the given version', async () => {
      const { repository, savedObjectsClient } = createRepository();

      await repository.update({ id: 'inv-1', patch: { status: 'completed' }, version: 'WzEsMV0=' });

      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        TYPE,
        'inv-1',
        { status: 'completed' },
        { version: 'WzEsMV0=' }
      );
    });

    it('maps a conflict to InvestigationStaleWriteError', async () => {
      const { repository, savedObjectsClient } = createRepository();
      savedObjectsClient.update.mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError(TYPE, 'inv-1')
      );

      await expect(
        repository.update({ id: 'inv-1', patch: { status: 'completed' }, version: 'stale' })
      ).rejects.toThrow(InvestigationStaleWriteError);
    });
  });

  describe('find()', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('builds a status OR filter, concurrency-key filter, and date bounds', async () => {
      const { repository, savedObjectsClient } = createRepository();
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [savedObject],
        total: 1,
        page: 1,
        per_page: 20,
      });

      const result = await repository.find({
        statuses: ['running', 'completed'],
        concurrencyKey: 'key-1',
        createdAfter: '2024-01-01T00:00:00Z',
        createdBefore: '2024-01-31T00:00:00Z',
        startedAfter: '2024-01-15T00:00:00Z',
        startedBefore: '2024-01-20T00:00:00Z',
        completedAfter: '2024-02-01T00:00:00Z',
        completedBefore: '2024-02-28T00:00:00Z',
        sortField: 'completed_at',
        sortOrder: 'asc',
        page: 2,
        perPage: 10,
      });

      expect(savedObjectsClient.find).toHaveBeenCalledWith({
        type: TYPE,
        filter:
          `(${TYPE}.attributes.status: "running" OR ${TYPE}.attributes.status: "completed")` +
          ` AND ${TYPE}.attributes.concurrency_key: "key-1"` +
          ` AND ${TYPE}.attributes.created_at >= "2024-01-01T00:00:00Z"` +
          ` AND ${TYPE}.attributes.created_at <= "2024-01-31T00:00:00Z"` +
          ` AND ${TYPE}.attributes.started_at >= "2024-01-15T00:00:00Z"` +
          ` AND ${TYPE}.attributes.started_at <= "2024-01-20T00:00:00Z"` +
          ` AND ${TYPE}.attributes.completed_at >= "2024-02-01T00:00:00Z"` +
          ` AND ${TYPE}.attributes.completed_at <= "2024-02-28T00:00:00Z"`,
        sortField: 'completed_at',
        sortOrder: 'asc',
        page: 2,
        perPage: 10,
      });
      expect(result).toEqual({
        results: [{ id: 'inv-1', version: 'WzEsMV0=', ...attributes }],
        total: 1,
        page: 1,
        size: 20,
      });
    });

    it('escapes quotes in filter values', async () => {
      const { repository, savedObjectsClient } = createRepository();
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 1,
      });

      await repository.find({ concurrencyKey: 'key-"quoted"' });

      expect(savedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: `${TYPE}.attributes.concurrency_key: "key-\\"quoted\\""`,
        })
      );
    });

    it('forwards attribute fields so the result is a projection', async () => {
      const { repository, savedObjectsClient } = createRepository();
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [savedObject],
        total: 1,
        page: 1,
        per_page: 20,
      });

      await repository.find({ fields: ['status', 'created_at'] });

      expect(savedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ fields: ['status', 'created_at'] })
      );
    });

    it('omits the filter when none are given', async () => {
      const { repository, savedObjectsClient } = createRepository();
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 20,
      });

      await repository.find({});

      expect(savedObjectsClient.find).toHaveBeenCalledWith({
        type: TYPE,
        filter: undefined,
        sortField: 'created_at',
        sortOrder: 'desc',
        page: undefined,
        perPage: undefined,
      });
    });
  });
});
