/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import Boom from '@hapi/boom';
import { OBSERVABLE_TYPE_IPV4, MAX_OBSERVABLES_PER_PAGE } from '../../../common/constants';
import type { Observable } from '../../../common/types/domain';
import { Operations } from '../../authorization';
import { mockCases } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { findObservables } from './find_observables';

const caseSO = mockCases[0];

const buildObservable = (id: string, value: string, createdAt: string): Observable => ({
  id,
  typeKey: OBSERVABLE_TYPE_IPV4.key,
  value,
  description: null,
  createdAt,
  updatedAt: null,
});

const observables = [
  buildObservable('obs-1', '1.1.1.1', '2026-01-01T00:00:00.000Z'),
  buildObservable('obs-2', '2.2.2.2', '2026-01-02T00:00:00.000Z'),
  buildObservable('obs-3', '3.3.3.3', '2026-01-03T00:00:00.000Z'),
];

describe('findObservables', () => {
  let clientArgs: ReturnType<typeof createCasesClientMockArgs>;

  const { id: caseId } = caseSO;
  const { owner } = caseSO.attributes;

  beforeEach(() => {
    jest.clearAllMocks();
    clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.getCase.mockResolvedValue({
      ...caseSO,
      attributes: { ...caseSO.attributes, observables },
    });
  });

  describe('authorization', () => {
    it('authorizes getting the case before reading any observable from the index', async () => {
      clientArgs.services.observablesStorageMode.getReadSource.mockReturnValue('index');

      await findObservables(caseId, {}, clientArgs);

      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
        operation: Operations.getCase,
        entities: [{ owner, id: caseId }],
      });
      expect(clientArgs.authorization.ensureAuthorized.mock.invocationCallOrder[0]).toBeLessThan(
        clientArgs.services.observablesService.findObservables.mock.invocationCallOrder[0]
      );
    });

    it.each(['case', 'index'] as const)(
      'returns nothing and reads nothing from the %s when the user may not get the case',
      async (source) => {
        // Failure scenario: a user without access to the case asks for its observables.
        clientArgs.services.observablesStorageMode.getReadSource.mockReturnValue(source);
        clientArgs.authorization.ensureAuthorized.mockRejectedValue(
          Boom.forbidden('Unauthorized to get case')
        );

        await expect(findObservables(caseId, {}, clientArgs)).rejects.toMatchObject({
          wrappedError: { output: { statusCode: 403 } },
        });
        expect(clientArgs.services.observablesService.findObservables).not.toHaveBeenCalled();
      }
    );

    it('answers 404 for a case that does not exist, or that is in another space', async () => {
      clientArgs.services.caseService.getCase.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError('cases', caseId)
      );

      await expect(findObservables(caseId, {}, clientArgs)).rejects.toMatchObject({
        wrappedError: { output: { statusCode: 404 } },
      });
      expect(clientArgs.authorization.ensureAuthorized).not.toHaveBeenCalled();
      expect(clientArgs.services.observablesService.findObservables).not.toHaveBeenCalled();
    });

    it('is not a write: it needs no license and records nothing', async () => {
      await findObservables(caseId, {}, clientArgs);

      expect(clientArgs.services.licensingService.isAtLeastPlatinum).not.toHaveBeenCalled();
      expect(clientArgs.services.caseService.patchCase).not.toHaveBeenCalled();
      expect(clientArgs.services.userActionService.creator.createUserAction).not.toHaveBeenCalled();
    });
  });

  describe('request validation', () => {
    it.each([
      ['a page size of 0', { perPage: 0 }],
      ['a page size above the maximum', { perPage: MAX_OBSERVABLES_PER_PAGE + 1 }],
      ['an unknown sort field', { sortField: 'description' }],
      ['an unknown attribute', { page: 2 }],
    ])('rejects %s before reading the case', async (_, params) => {
      await expect(
        findObservables(caseId, params as Parameters<typeof findObservables>[1], clientArgs)
      ).rejects.toMatchObject({ wrappedError: { output: { statusCode: 400 } } });
      expect(clientArgs.services.caseService.getCase).not.toHaveBeenCalled();
    });
  });

  describe('while the case field is the source of truth', () => {
    beforeEach(() => {
      clientArgs.services.observablesStorageMode.getReadSource.mockReturnValue('case');
    });

    it('pages the observables of the case without touching the index', async () => {
      const result = await findObservables(caseId, { perPage: 2 }, clientArgs);

      expect(result.observables.map(({ id }) => id)).toEqual(['obs-1', 'obs-2']);
      expect(result.total).toBe(3);
      expect(result.cursor).toEqual(expect.any(String));
      expect(clientArgs.services.observablesService.findObservables).not.toHaveBeenCalled();
    });

    it('continues with the cursor of the previous page and ends without a cursor', async () => {
      const first = await findObservables(caseId, { perPage: 2 }, clientArgs);

      const second = await findObservables(
        caseId,
        { perPage: 2, cursor: first.cursor },
        clientArgs
      );

      expect(second.observables.map(({ id }) => id)).toEqual(['obs-3']);
      expect(second.cursor).toBeUndefined();
    });

    it('sorts and filters by type', async () => {
      const result = await findObservables(
        caseId,
        { sortOrder: 'desc', typeKeys: [OBSERVABLE_TYPE_IPV4.key] },
        clientArgs
      );

      expect(result.observables.map(({ id }) => id)).toEqual(['obs-3', 'obs-2', 'obs-1']);
      const none = await findObservables(caseId, { typeKeys: ['other-type'] }, clientArgs);
      expect(none).toEqual({ observables: [], total: 0, cursor: undefined });
    });

    it('lists nothing for a case without observables', async () => {
      clientArgs.services.caseService.getCase.mockResolvedValue({
        ...caseSO,
        attributes: { ...caseSO.attributes, observables: undefined },
      } as unknown as Awaited<ReturnType<typeof clientArgs.services.caseService.getCase>>);

      expect(await findObservables(caseId, {}, clientArgs)).toEqual({
        observables: [],
        total: 0,
        cursor: undefined,
      });
    });
  });

  describe('once the index is the source of truth', () => {
    const searchAfter = ['2026-01-02T00:00:00.000Z', OBSERVABLE_TYPE_IPV4.key, '2.2.2.2'];

    beforeEach(() => {
      clientArgs.services.observablesStorageMode.getReadSource.mockReturnValue('index');
      clientArgs.services.observablesService.findObservables.mockResolvedValue({
        observables: [observables[0], observables[1]],
        total: 3,
        searchAfter,
      });
    });

    it('reads the page from the index, limited to the case, its space and its owner', async () => {
      const result = await findObservables(
        caseId,
        { typeKeys: [OBSERVABLE_TYPE_IPV4.key], sortField: 'value', sortOrder: 'desc', perPage: 2 },
        clientArgs
      );

      expect(clientArgs.services.observablesService.findObservables).toHaveBeenCalledWith({
        caseId,
        spaceId: clientArgs.spaceId,
        owner,
        typeKeys: [OBSERVABLE_TYPE_IPV4.key],
        sortField: 'value',
        sortOrder: 'desc',
        perPage: 2,
        searchAfter: undefined,
      });
      expect(result.observables).toEqual([observables[0], observables[1]]);
      expect(result.total).toBe(3);
    });

    it('does not read the case field for the page', async () => {
      clientArgs.services.caseService.getCase.mockResolvedValue({
        ...caseSO,
        attributes: { ...caseSO.attributes, observables: [] },
      });

      const result = await findObservables(caseId, {}, clientArgs);

      expect(result.observables).toHaveLength(2);
    });

    it('continues with the sort values carried by the cursor', async () => {
      const first = await findObservables(caseId, { perPage: 2 }, clientArgs);
      clientArgs.services.observablesService.findObservables.mockResolvedValue({
        observables: [observables[2]],
        total: 3,
      });

      const second = await findObservables(
        caseId,
        { perPage: 2, cursor: first.cursor },
        clientArgs
      );

      expect(clientArgs.services.observablesService.findObservables).toHaveBeenLastCalledWith(
        expect.objectContaining({ searchAfter })
      );
      expect(second.cursor).toBeUndefined();
    });

    it('gives no cursor on the last page', async () => {
      clientArgs.services.observablesService.findObservables.mockResolvedValue({
        observables,
        total: 3,
      });

      expect((await findObservables(caseId, {}, clientArgs)).cursor).toBeUndefined();
    });

    it('asks to start again when the cursor was made while reads came from the case field', async () => {
      // Failure scenario: reads moved to the index between two pages of the same listing.
      clientArgs.services.observablesStorageMode.getReadSource.mockReturnValue('case');
      const caseCursor = (await findObservables(caseId, { perPage: 1 }, clientArgs)).cursor;
      clientArgs.services.observablesStorageMode.getReadSource.mockReturnValue('index');

      await expect(
        findObservables(caseId, { perPage: 1, cursor: caseCursor }, clientArgs)
      ).rejects.toMatchObject({ wrappedError: { output: { statusCode: 400 } } });
      expect(clientArgs.services.observablesService.findObservables).not.toHaveBeenCalled();
    });

    it('fails the request when the index cannot be read', async () => {
      // Failure scenario: Elasticsearch rejects the search. An empty list would hide observables.
      clientArgs.services.observablesService.findObservables.mockRejectedValue(
        new Error('search failed')
      );

      await expect(findObservables(caseId, {}, clientArgs)).rejects.toThrow('search failed');
    });
  });
});
