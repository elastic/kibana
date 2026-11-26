/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { MAX_BULK_GET_CASES } from '../../../common/constants';
import type { Observable } from '../../../common/types/domain';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import { mockCases } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { bulkGet } from './bulk_get';

describe('bulkGet', () => {
  const caseSO = mockCases[0];

  it('returns updated totalEvents from attachment stats', async () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.services.caseService.getCases.mockResolvedValue({
      saved_objects: [caseSO],
    });
    clientArgs.authorization.getAndEnsureAuthorizedEntities.mockResolvedValue({
      authorized: [caseSO],
      unauthorized: [],
    });
    clientArgs.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
      new Map([
        [
          caseSO.id,
          {
            alerts: 0,
            userComments: 1,
            events: 3,
          },
        ],
      ])
    );

    const res = await bulkGet({ ids: [caseSO.id] }, clientArgs);

    expect(res.errors).toEqual([]);
    expect(res.cases[0]).toEqual(expect.objectContaining({ totalEvents: 3, totalComment: 1 }));
  });

  describe('observables', () => {
    const fieldObservable: Observable = {
      id: 'field-1',
      typeKey: 'observable-type-ipv4',
      value: '10.0.0.1',
      description: null,
      createdAt: '2026-11-06T09:30:00.000Z',
      updatedAt: null,
    };
    const typeObservable: Observable = { ...fieldObservable, id: 'type-1', value: '10.0.0.2' };
    const caseWithObservables: CaseSavedObjectTransformed = {
      ...caseSO,
      attributes: { ...caseSO.attributes, observables: [fieldObservable], total_observables: 1 },
    };
    const otherCase: CaseSavedObjectTransformed = { ...mockCases[1] };

    const createArgs = () => {
      const clientArgs = createCasesClientMockArgs();
      clientArgs.services.caseService.getCases.mockResolvedValue({
        saved_objects: [caseWithObservables, otherCase],
      });
      clientArgs.authorization.getAndEnsureAuthorizedEntities.mockResolvedValue({
        authorized: [caseWithObservables, otherCase],
        unauthorized: [],
      });
      clientArgs.services.observableService.getter.getPreviews.mockResolvedValue(
        new Map([[caseWithObservables.id, { count: 3, oldest: [typeObservable] }]])
      );
      return clientArgs;
    };

    it('lists the field first, then the oldest objects, and counts both stores', async () => {
      const clientArgs = createArgs();
      clientArgs.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
        new Map()
      );

      const res = await bulkGet({ ids: [caseWithObservables.id, otherCase.id] }, clientArgs);

      expect(res.cases[0]).toMatchObject({
        observables: [fieldObservable, typeObservable],
        total_observables: 4,
      });
      expect(res.cases[1]).toMatchObject({ observables: [], total_observables: 0 });
    });

    it('requests one preview for the authorized cases, sized for the most room', async () => {
      const clientArgs = createArgs();
      clientArgs.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
        new Map()
      );

      await bulkGet({ ids: [caseWithObservables.id, otherCase.id] }, clientArgs);

      expect(clientArgs.services.observableService.getter.getPreviews).toHaveBeenCalledTimes(1);
      expect(clientArgs.services.observableService.getter.getPreviews).toHaveBeenCalledWith(
        [caseWithObservables.id, otherCase.id],
        50
      );
    });

    it('requests the previews alongside the attachment totals', async () => {
      const clientArgs = createArgs();
      let totalsResolved = false;
      let previewsRequestedBeforeTotals = false;
      clientArgs.services.attachmentService.getter.getCaseAttatchmentStats.mockImplementation(
        async () => {
          await new Promise(setImmediate);
          totalsResolved = true;
          return new Map();
        }
      );
      clientArgs.services.observableService.getter.getPreviews.mockImplementation(async () => {
        previewsRequestedBeforeTotals = !totalsResolved;
        return new Map();
      });

      await bulkGet({ ids: [caseWithObservables.id, otherCase.id] }, clientArgs);

      expect(previewsRequestedBeforeTotals).toBe(true);
    });
  });

  describe('errors', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.authorization.getAndEnsureAuthorizedEntities.mockResolvedValue({
      authorized: [caseSO],
      unauthorized: [],
    });

    clientArgs.services.attachmentService.getter.getCaseAttatchmentStats.mockResolvedValue(
      new Map()
    );

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it(`throws when trying to fetch more than ${MAX_BULK_GET_CASES} cases`, async () => {
      await expect(
        bulkGet({ ids: Array(MAX_BULK_GET_CASES + 1).fill('foobar') }, clientArgs)
      ).rejects.toThrow(
        `Error: ids: The length of the field ids is too long. Array must be of length <= ${MAX_BULK_GET_CASES}.`
      );
    });

    it('throws when trying to fetch zero cases', async () => {
      await expect(bulkGet({ ids: [] }, clientArgs)).rejects.toThrow(
        'Error: ids: The length of the field ids is too short. Array must be of length >= 1.'
      );
    });

    it('throws with excess fields', async () => {
      await expect(
        bulkGet(
          // @ts-expect-error: excess attribute
          { ids: ['1'], foo: 'bar' },
          clientArgs
        )
      ).rejects.toThrow('Excess keys are not allowed');
    });

    it('constructs the case error correctly', async () => {
      clientArgs.services.caseService.getCases.mockResolvedValue({
        saved_objects: [
          caseSO,
          {
            id: '1',
            type: 'cases',
            error: {
              error: 'My error',
              message: 'not found',
              statusCode: 404,
            },
            references: [],
          },
        ],
      });

      const res = await bulkGet({ ids: ['my-case-1'] }, clientArgs);

      expect(res.cases.length).toBe(1);
      expect(res.errors.length).toBe(1);

      expect(res.errors[0]).toEqual({
        caseId: '1',
        error: 'My error',
        message: 'not found',
        status: 404,
      });
    });

    it('constructs the case error correctly in case of an SO decorated error', async () => {
      clientArgs.services.caseService.getCases.mockResolvedValue({
        saved_objects: [
          caseSO,
          {
            id: '1',
            type: 'cases',
            // @ts-expect-error: the error property of the SO client is not typed correctly
            error: {
              ...Boom.boomify(new Error('My error'), {
                statusCode: 404,
                message: 'SO not found',
              }),
            },
            references: [],
          },
        ],
      });

      const res = await bulkGet({ ids: ['my-case-1'] }, clientArgs);

      expect(res.cases.length).toBe(1);
      expect(res.errors.length).toBe(1);

      expect(res.errors[0]).toEqual({
        caseId: '1',
        error: 'Not Found',
        message: 'SO not found: My error',
        status: 404,
      });
    });
  });
});
