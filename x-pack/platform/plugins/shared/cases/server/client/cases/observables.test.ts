/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SavedObjectsFindOptions } from '@kbn/core/server';
import {
  addObservable,
  applyObservablesToCase,
  bulkAddObservables,
  bulkCreateObservables,
  bulkDeleteObservables,
  deleteObservable,
  updateObservable,
} from './observables';
import { deriveObservableId } from './observables_storage';
import { LICENSING_CASE_OBSERVABLES_FEATURE } from '../../common/constants';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { mockCases } from '../../mocks';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_OBSERVABLES_BULK_CREATE,
  MAX_STORED_OBSERVABLES_PER_CASE,
  OBSERVABLE_TYPE_IPV4,
} from '../../../common/constants';
import { OBSERVABLE_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import type { ObservablePost } from '../../../common/types/api';
import { UserActionTypes } from '../../../common/types/domain/user_action/v1';

const caseSO = mockCases[0];

const mockCasesClient = createCasesClientMock();
const mockClientArgs = createCasesClientMockArgs();

const {
  unsecuredSavedObjectsClient: mockSOClient,
  services: {
    attachmentService: mockAttachmentService,
    caseService: mockCaseService,
    licensingService: mockLicensingService,
    userActionService: mockUserActionService,
  },
} = mockClientArgs;

const ipv4 = (value: string): ObservablePost => ({
  typeKey: OBSERVABLE_TYPE_IPV4.key,
  value,
  description: null,
});

const observableSO = (value: string, caseId: string = caseSO.id) => ({
  id: deriveObservableId({ caseId, typeKey: OBSERVABLE_TYPE_IPV4.key, value }),
  type: CASE_ATTACHMENT_SAVED_OBJECT,
  attributes: {
    type: OBSERVABLE_ATTACHMENT_TYPE,
    owner: caseSO.attributes.owner,
    data: { typeKey: OBSERVABLE_TYPE_IPV4.key, value, description: null },
    created_at: '2026-11-04T00:00:00.000Z',
  },
  references: [{ type: CASE_SAVED_OBJECT, name: `associated-${CASE_SAVED_OBJECT}`, id: caseId }],
});

/** Stored observable count, returned by the count query; the summary query returns no buckets. */
let storedCount = 0;
/** Ids `bulkCreate` reports as conflicts (already on the case). */
let existingIds = new Set<string>();

const mockBulkCreate = () =>
  mockSOClient.bulkCreate.mockImplementation(async (objects) => ({
    saved_objects: objects.map(({ id = '', attributes, references = [] }) =>
      existingIds.has(id)
        ? {
            id,
            type: CASE_ATTACHMENT_SAVED_OBJECT,
            attributes,
            references,
            error: { statusCode: 409, error: 'Conflict', message: 'conflict' },
          }
        : { id, type: CASE_ATTACHMENT_SAVED_OBJECT, attributes, references }
    ),
  }));

const bulkCreatedIds = (): string[] =>
  mockSOClient.bulkCreate.mock.calls.flatMap(([objects]) => objects.map(({ id = '' }) => id));

const deletedObjects = (...ids: string[]) => [
  ids.map((id) => ({ type: CASE_ATTACHMENT_SAVED_OBJECT, id })),
  { refresh: 'wait_for' },
];

describe('observables client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storedCount = 0;
    existingIds = new Set();

    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    mockCaseService.getCase.mockResolvedValue(caseSO);
    mockSOClient.find.mockImplementation(async (options: SavedObjectsFindOptions) => ({
      total: options.aggs ? 0 : storedCount,
      saved_objects: [],
      page: 1,
      per_page: 0,
      aggregations: { refs: { caseIds: { buckets: [] } } },
    }));
    mockBulkCreate();
    mockSOClient.bulkDelete.mockResolvedValue({ statuses: [] });
  });

  describe('applyObservablesToCase', () => {
    it('creates one attachment per observable with an id derived from the case, type and value', async () => {
      await applyObservablesToCase(caseSO.id, [ipv4('10.0.0.1')], mockClientArgs, caseSO);

      expect(mockSOClient.bulkCreate).toHaveBeenCalledWith(
        [
          {
            type: CASE_ATTACHMENT_SAVED_OBJECT,
            id: deriveObservableId({
              caseId: caseSO.id,
              typeKey: OBSERVABLE_TYPE_IPV4.key,
              value: '10.0.0.1',
            }),
            attributes: expect.objectContaining({
              type: OBSERVABLE_ATTACHMENT_TYPE,
              owner: caseSO.attributes.owner,
              data: { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '10.0.0.1', description: null },
            }),
            references: [
              { type: CASE_SAVED_OBJECT, name: `associated-${CASE_SAVED_OBJECT}`, id: caseSO.id },
            ],
          },
        ],
        { refresh: 'wait_for' }
      );
      expect(mockAttachmentService.bulkCreate).not.toHaveBeenCalled();
    });

    it('never writes the case document', async () => {
      await applyObservablesToCase(caseSO.id, [ipv4('10.0.0.1')], mockClientArgs, caseSO);

      expect(mockCaseService.patchCase).not.toHaveBeenCalled();
    });

    it('dedupes observables within the request', async () => {
      const result = await applyObservablesToCase(
        caseSO.id,
        [ipv4('10.0.0.1'), ipv4('10.0.0.1'), ipv4('10.0.0.2')],
        mockClientArgs,
        caseSO
      );

      expect(bulkCreatedIds()).toHaveLength(2);
      expect(result.newlyAddedObservables).toHaveLength(2);
      expect(result.duplicates).toBe(1);
    });

    it('counts observables the case already holds as duplicates', async () => {
      existingIds = new Set([observableSO('10.0.0.1').id]);

      const result = await applyObservablesToCase(
        caseSO.id,
        [ipv4('10.0.0.1'), ipv4('10.0.0.2')],
        mockClientArgs,
        caseSO
      );

      expect(result.newlyAddedObservables.map(({ value }) => value)).toEqual(['10.0.0.2']);
      expect(result.duplicates).toBe(1);
    });

    it('records one user action carrying the added count', async () => {
      await applyObservablesToCase(
        caseSO.id,
        [ipv4('10.0.0.1'), ipv4('10.0.0.2')],
        mockClientArgs,
        caseSO
      );

      expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledTimes(1);
      expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledWith({
        userAction: expect.objectContaining({
          type: UserActionTypes.observables,
          caseId: caseSO.id,
          payload: { observables: { count: 2, actionType: 'add' } },
        }),
      });
    });

    it('records no user action when nothing is added', async () => {
      existingIds = new Set([observableSO('10.0.0.1').id]);

      const result = await applyObservablesToCase(
        caseSO.id,
        [ipv4('10.0.0.1')],
        mockClientArgs,
        caseSO
      );

      expect(result.newlyAddedObservables).toEqual([]);
      expect(mockUserActionService.creator.createUserAction).not.toHaveBeenCalled();
    });

    it('adds only what fits under the per-case cap and reports the rest', async () => {
      storedCount = MAX_STORED_OBSERVABLES_PER_CASE - 1;

      const result = await applyObservablesToCase(
        caseSO.id,
        [ipv4('10.0.0.1'), ipv4('10.0.0.2'), ipv4('10.0.0.3')],
        mockClientArgs,
        caseSO
      );

      expect(bulkCreatedIds()).toHaveLength(1);
      expect(result.overCap).toBe(2);
      expect(result.totalObservables).toBe(MAX_STORED_OBSERVABLES_PER_CASE);
    });

    it('writes in chunks of the bulk create limit', async () => {
      const observables = Array.from({ length: MAX_OBSERVABLES_BULK_CREATE + 5 }, (_, index) =>
        ipv4(`10.0.${Math.floor(index / 256)}.${index % 256}`)
      );

      const result = await applyObservablesToCase(caseSO.id, observables, mockClientArgs, caseSO);

      expect(mockSOClient.bulkCreate).toHaveBeenCalledTimes(2);
      expect(result.newlyAddedObservables).toHaveLength(MAX_OBSERVABLES_BULK_CREATE + 5);
    });

    it('throws when an attachment fails for a reason other than a conflict', async () => {
      mockSOClient.bulkCreate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'x',
            type: CASE_ATTACHMENT_SAVED_OBJECT,
            error: { statusCode: 500, error: 'Internal', message: 'boom' },
            attributes: {},
            references: [],
          },
        ],
      });

      await expect(
        applyObservablesToCase(caseSO.id, [ipv4('10.0.0.1')], mockClientArgs, caseSO)
      ).rejects.toThrow('Failed to create 1 observables');
    });
  });

  describe('addObservable', () => {
    it('adds an observable and emits the trigger with its derived id', async () => {
      const result = await addObservable(
        caseSO.id,
        { observable: ipv4('10.0.0.1') },
        mockClientArgs,
        mockCasesClient
      );

      expect(mockLicensingService.notifyUsage).toHaveBeenCalledWith(
        LICENSING_CASE_OBSERVABLES_FEATURE
      );
      expect(result.id).toBe(caseSO.id);
      expect(mockClientArgs.casesEventBus.emitObservablesAdded).toHaveBeenCalledWith(
        mockClientArgs.request,
        {
          caseId: caseSO.id,
          owner: caseSO.attributes.owner,
          observableIds: [observableSO('10.0.0.1').id],
          observableTypeKeys: [OBSERVABLE_TYPE_IPV4.key],
        }
      );
    });

    it('builds the case response from the stored observables', async () => {
      const result = await addObservable(
        caseSO.id,
        { observable: ipv4('10.0.0.1') },
        mockClientArgs,
        mockCasesClient
      );

      expect(result.observables).toEqual([]);
      expect(result.total_observables).toBe(0);
      expect(mockSOClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ type: CASE_ATTACHMENT_SAVED_OBJECT, aggs: expect.anything() })
      );
    });

    it('throws when the license is below platinum', async () => {
      mockLicensingService.isAtLeastPlatinum.mockResolvedValue(false);

      await expect(
        addObservable(caseSO.id, { observable: ipv4('10.0.0.1') }, mockClientArgs, mockCasesClient)
      ).rejects.toThrow(
        Boom.forbidden(
          'In order to assign observables to cases, you must be subscribed to an Elastic Platinum license'
        )
      );
    });

    it('rejects a value that is not valid for its type', async () => {
      await expect(
        addObservable(caseSO.id, { observable: ipv4('not an ip') }, mockClientArgs, mockCasesClient)
      ).rejects.toThrow('is not valid for selected observable type');
      expect(mockSOClient.bulkCreate).not.toHaveBeenCalled();
    });

    it('rejects an unknown type key', async () => {
      await expect(
        addObservable(
          caseSO.id,
          { observable: { typeKey: 'invalid type', value: '10.0.0.1', description: null } },
          mockClientArgs,
          mockCasesClient
        )
      ).rejects.toThrow('Invalid observable type, key does not exist: invalid type');
    });

    it('rejects an observable the case already holds and does not emit', async () => {
      existingIds = new Set([observableSO('10.0.0.1').id]);

      await expect(
        addObservable(caseSO.id, { observable: ipv4('10.0.0.1') }, mockClientArgs, mockCasesClient)
      ).rejects.toThrow('Invalid duplicated observables in request.');
      expect(mockClientArgs.casesEventBus.emitObservablesAdded).not.toHaveBeenCalled();
    });

    it('rejects an observable when the case is at the cap', async () => {
      storedCount = MAX_STORED_OBSERVABLES_PER_CASE;

      await expect(
        addObservable(caseSO.id, { observable: ipv4('10.0.0.1') }, mockClientArgs, mockCasesClient)
      ).rejects.toThrow(`Max ${MAX_STORED_OBSERVABLES_PER_CASE} observables per case is allowed.`);
      expect(mockSOClient.bulkCreate).not.toHaveBeenCalled();
    });
  });

  describe('updateObservable', () => {
    beforeEach(() => {
      mockSOClient.bulkGet.mockResolvedValue({ saved_objects: [observableSO('10.0.0.1')] });
    });

    it('updates the description in place when the value does not change', async () => {
      const { id } = observableSO('10.0.0.1');

      await updateObservable(
        caseSO.id,
        id,
        { observable: { value: '10.0.0.1', description: 'new description' } },
        mockClientArgs,
        mockCasesClient
      );

      expect(mockSOClient.update).toHaveBeenCalledWith(
        CASE_ATTACHMENT_SAVED_OBJECT,
        id,
        expect.objectContaining({
          data: {
            typeKey: OBSERVABLE_TYPE_IPV4.key,
            value: '10.0.0.1',
            description: 'new description',
          },
        }),
        { refresh: 'wait_for' }
      );
      expect(mockSOClient.bulkCreate).not.toHaveBeenCalled();
      expect(mockSOClient.bulkDelete).not.toHaveBeenCalled();
    });

    it('replaces the observable when the value changes, because the id follows the value', async () => {
      const { id } = observableSO('10.0.0.1');

      await updateObservable(
        caseSO.id,
        id,
        { observable: { value: '10.0.0.2', description: null } },
        mockClientArgs,
        mockCasesClient
      );

      expect(bulkCreatedIds()).toEqual([observableSO('10.0.0.2').id]);
      expect(mockSOClient.bulkDelete).toHaveBeenCalledWith(...deletedObjects(id));
      expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledWith({
        userAction: expect.objectContaining({
          payload: { observables: { count: 1, actionType: 'update' } },
        }),
      });
    });

    describe('metadata', () => {
      const metadata = { verdict: 'malicious' };
      const storedWithMetadata = () => {
        const so = observableSO('10.0.0.1');
        return {
          ...so,
          attributes: { ...so.attributes, data: { ...so.attributes.data, metadata } },
        };
      };
      const createdData = () =>
        (mockSOClient.bulkCreate.mock.calls[0][0][0].attributes as { data: { metadata?: object } })
          .data;
      const updatedData = () => (mockSOClient.update.mock.calls[0][2] as { data: object }).data;

      beforeEach(() => {
        mockSOClient.bulkGet.mockResolvedValue({ saved_objects: [storedWithMetadata()] });
      });

      it('does not send metadata in place when the request leaves it out, so it is kept', async () => {
        await updateObservable(
          caseSO.id,
          observableSO('10.0.0.1').id,
          { observable: { value: '10.0.0.1', description: 'new description' } },
          mockClientArgs,
          mockCasesClient
        );

        expect(updatedData()).not.toHaveProperty('metadata');
      });

      it.each([
        ['replaces', { verdict: 'benign' }],
        ['clears', null],
      ])('%s the metadata in place', async (_, next) => {
        await updateObservable(
          caseSO.id,
          observableSO('10.0.0.1').id,
          { observable: { value: '10.0.0.1', description: null, metadata: next } },
          mockClientArgs,
          mockCasesClient
        );

        expect(updatedData()).toEqual(expect.objectContaining({ metadata: next }));
      });

      it('carries the metadata to the new observable when the value changes', async () => {
        await updateObservable(
          caseSO.id,
          observableSO('10.0.0.1').id,
          { observable: { value: '10.0.0.2', description: null } },
          mockClientArgs,
          mockCasesClient
        );

        expect(createdData().metadata).toEqual(metadata);
      });

      it('applies the requested metadata to the new observable when the value changes', async () => {
        await updateObservable(
          caseSO.id,
          observableSO('10.0.0.1').id,
          { observable: { value: '10.0.0.2', description: null, metadata: null } },
          mockClientArgs,
          mockCasesClient
        );

        expect(createdData()).not.toHaveProperty('metadata');
      });
    });

    it('keeps the original when the new value is already on the case', async () => {
      existingIds = new Set([observableSO('10.0.0.2').id]);

      await expect(
        updateObservable(
          caseSO.id,
          observableSO('10.0.0.1').id,
          { observable: { value: '10.0.0.2', description: null } },
          mockClientArgs,
          mockCasesClient
        )
      ).rejects.toThrow('Invalid duplicated observables in request.');
      expect(mockSOClient.bulkDelete).not.toHaveBeenCalled();
    });

    it('rejects an observable of another case', async () => {
      mockSOClient.bulkGet.mockResolvedValue({
        saved_objects: [observableSO('10.0.0.1', 'other-case')],
      });

      await expect(
        updateObservable(
          caseSO.id,
          observableSO('10.0.0.1').id,
          { observable: { value: '10.0.0.2', description: null } },
          mockClientArgs,
          mockCasesClient
        )
      ).rejects.toThrow('not found');
    });
  });

  describe('deleteObservable', () => {
    it('deletes an observable of the case and records the user action', async () => {
      mockSOClient.bulkGet.mockResolvedValue({ saved_objects: [observableSO('10.0.0.1')] });
      const { id } = observableSO('10.0.0.1');

      await deleteObservable(caseSO.id, id, mockClientArgs, mockCasesClient);

      expect(mockSOClient.bulkDelete).toHaveBeenCalledWith(...deletedObjects(id));
      expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledWith({
        userAction: expect.objectContaining({
          payload: { observables: { count: 1, actionType: 'delete' } },
        }),
      });
    });

    it('does not delete an attachment that is not an observable', async () => {
      mockSOClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            ...observableSO('10.0.0.1'),
            attributes: { ...observableSO('10.0.0.1').attributes, type: 'comment' },
          },
        ],
      });

      await expect(
        deleteObservable(caseSO.id, 'some-id', mockClientArgs, mockCasesClient)
      ).rejects.toThrow('not found');
      expect(mockSOClient.bulkDelete).not.toHaveBeenCalled();
    });
  });

  describe('bulkDeleteObservables', () => {
    it('deletes every requested observable and records one user action', async () => {
      const first = observableSO('10.0.0.1');
      const second = observableSO('10.0.0.2');
      mockSOClient.bulkGet.mockResolvedValue({ saved_objects: [first, second] });

      await bulkDeleteObservables(
        { caseId: caseSO.id, observableIds: [first.id, second.id, first.id] },
        mockClientArgs
      );

      expect(mockSOClient.bulkDelete).toHaveBeenCalledWith(...deletedObjects(first.id, second.id));
      expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledWith({
        userAction: expect.objectContaining({
          payload: { observables: { count: 2, actionType: 'delete' } },
        }),
      });
    });

    it('returns 404 listing the ids the case does not hold', async () => {
      const first = observableSO('10.0.0.1');
      mockSOClient.bulkGet.mockResolvedValue({
        saved_objects: [
          first,
          {
            id: 'missing',
            type: CASE_ATTACHMENT_SAVED_OBJECT,
            error: { statusCode: 404, error: 'Not Found', message: 'missing' },
            attributes: {},
            references: [],
          },
        ],
      });

      await expect(
        bulkDeleteObservables(
          { caseId: caseSO.id, observableIds: [first.id, 'missing'] },
          mockClientArgs
        )
      ).rejects.toThrow(
        Boom.notFound('Failed to bulk delete observables: observable ids not found: missing')
      );
      expect(mockSOClient.bulkDelete).not.toHaveBeenCalled();
    });
  });

  describe('bulkCreateObservables', () => {
    it('reports added, duplicate and over-cap counts', async () => {
      storedCount = MAX_STORED_OBSERVABLES_PER_CASE - 2;
      existingIds = new Set([observableSO('10.0.0.1').id]);

      const result = await bulkCreateObservables(
        {
          caseId: caseSO.id,
          observables: [ipv4('10.0.0.1'), ipv4('10.0.0.2'), ipv4('10.0.0.3'), ipv4('10.0.0.1')],
        },
        mockClientArgs,
        mockCasesClient
      );

      expect(result).toEqual({
        added: 1,
        duplicates: 2,
        over_cap: 1,
        total_observables: MAX_STORED_OBSERVABLES_PER_CASE - 1,
      });
    });

    it('validates every value', async () => {
      await expect(
        bulkCreateObservables(
          { caseId: caseSO.id, observables: [ipv4('10.0.0.1'), ipv4('not an ip')] },
          mockClientArgs,
          mockCasesClient
        )
      ).rejects.toThrow('is not valid for selected observable type');
      expect(mockSOClient.bulkCreate).not.toHaveBeenCalled();
    });

    it('does not emit the trigger when nothing was added', async () => {
      existingIds = new Set([observableSO('10.0.0.1').id]);

      await bulkCreateObservables(
        { caseId: caseSO.id, observables: [ipv4('10.0.0.1')] },
        mockClientArgs,
        mockCasesClient
      );

      expect(mockClientArgs.casesEventBus.emitObservablesAdded).not.toHaveBeenCalled();
    });
  });

  describe('bulkAddObservables', () => {
    it('returns the case and emits the added observables', async () => {
      const result = await bulkAddObservables(
        { caseId: caseSO.id, observables: [ipv4('10.0.0.1'), ipv4('10.0.0.2')] },
        mockClientArgs,
        mockCasesClient
      );

      expect(result.id).toBe(caseSO.id);
      expect(mockClientArgs.casesEventBus.emitObservablesAdded).toHaveBeenCalledWith(
        mockClientArgs.request,
        expect.objectContaining({
          observableIds: [observableSO('10.0.0.1').id, observableSO('10.0.0.2').id],
        })
      );
    });
  });
});
