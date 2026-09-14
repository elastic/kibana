/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { NIGHTSHIFT_INVESTIGATION_SO_TYPE } from '../saved_objects';
import { InvestigationStaleWriteError } from './errors';
import { SavedObjectInvestigationSweepRepository } from './saved_object_investigation_sweep_repository';

const TYPE = NIGHTSHIFT_INVESTIGATION_SO_TYPE;

const foundInvestigation = ({ id, namespaces }: { id: string; namespaces?: string[] }) => ({
  id,
  type: TYPE,
  namespaces,
  version: 'WzEsMV0=',
  references: [],
  score: 0,
  attributes: { status: 'running' as const, created_at: '2024-01-01T00:00:00Z' },
});

const findResponse = (savedObjects: Array<ReturnType<typeof foundInvestigation>>) => ({
  saved_objects: savedObjects,
  total: savedObjects.length,
  page: 1,
  per_page: 100,
});

const createRepository = () => {
  const savedObjects = savedObjectsRepositoryMock.create();
  return {
    savedObjects,
    repository: new SavedObjectInvestigationSweepRepository({ savedObjects }),
  };
};

describe('SavedObjectInvestigationSweepRepository', () => {
  describe('findAcrossSpaces()', () => {
    it('searches every space and forwards the query', async () => {
      const { repository, savedObjects } = createRepository();
      savedObjects.find.mockResolvedValue(findResponse([]));

      await repository.findAcrossSpaces({
        statuses: ['pending', 'running'],
        fields: ['status', 'created_at'],
        sortField: 'created_at',
        sortOrder: 'asc',
        page: 2,
        perPage: 50,
      });

      expect(savedObjects.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TYPE,
          namespaces: ['*'],
          fields: ['status', 'created_at'],
          sortField: 'created_at',
          sortOrder: 'asc',
          page: 2,
          perPage: 50,
        })
      );
      const [{ filter }] = savedObjects.find.mock.calls[0];
      expect(filter).toContain('status: "pending"');
      expect(filter).toContain('status: "running"');
    });

    it('reports the space each investigation belongs to', async () => {
      const { repository, savedObjects } = createRepository();
      savedObjects.find.mockResolvedValue(
        findResponse([
          foundInvestigation({ id: 'inv-1', namespaces: ['team-a'] }),
          foundInvestigation({ id: 'inv-2', namespaces: ['team-b'] }),
        ])
      );

      const { results } = await repository.findAcrossSpaces({
        statuses: ['running'],
        page: 1,
        perPage: 100,
      });

      expect(results).toEqual([
        {
          investigation: expect.objectContaining({ id: 'inv-1', status: 'running' }),
          spaceId: 'team-a',
        },
        {
          investigation: expect.objectContaining({ id: 'inv-2' }),
          spaceId: 'team-b',
        },
      ]);
    });

    it('treats a missing namespace as the default space', async () => {
      const { repository, savedObjects } = createRepository();
      savedObjects.find.mockResolvedValue(findResponse([foundInvestigation({ id: 'inv-1' })]));

      const { results } = await repository.findAcrossSpaces({
        statuses: ['running'],
        page: 1,
        perPage: 100,
      });

      expect(results).toEqual([
        { investigation: expect.objectContaining({ id: 'inv-1' }), spaceId: 'default' },
      ]);
    });
  });

  describe('updateInSpace()', () => {
    it('writes the patch to the given space at the given version', async () => {
      const { repository, savedObjects } = createRepository();

      await repository.updateInSpace({
        id: 'inv-1',
        spaceId: 'team-a',
        patch: { status: 'cancelled' },
        version: 'v1',
      });

      expect(savedObjects.update).toHaveBeenCalledWith(
        TYPE,
        'inv-1',
        { status: 'cancelled' },
        { namespace: 'team-a', version: 'v1' }
      );
    });

    it('maps a conflict to InvestigationStaleWriteError', async () => {
      const { repository, savedObjects } = createRepository();
      savedObjects.update.mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError(TYPE, 'inv-1')
      );

      await expect(
        repository.updateInSpace({ id: 'inv-1', spaceId: 'team-a', patch: { status: 'failed' } })
      ).rejects.toBeInstanceOf(InvestigationStaleWriteError);
    });

    it('rethrows anything else', async () => {
      const { repository, savedObjects } = createRepository();
      savedObjects.update.mockRejectedValue(new Error('elasticsearch unavailable'));

      await expect(
        repository.updateInSpace({ id: 'inv-1', spaceId: 'team-a', patch: { status: 'failed' } })
      ).rejects.toThrow('elasticsearch unavailable');
    });
  });
});
