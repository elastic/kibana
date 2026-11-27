/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  addObservable,
  deleteObservable,
  updateObservable,
  bulkAddObservables,
  bulkDeleteObservables,
  bulkGetObservables,
  applyObservablesToCase,
} from './observables';
import Boom from '@hapi/boom';
import type { SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { LICENSING_CASE_OBSERVABLES_FEATURE } from '../../common/constants';
import type { ObservablePersistedAttributes } from '../../common/types/observable';
import { Operations } from '../../authorization';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { mockObservablesPreviewSearchFailure } from '../../services/mocks';
import {
  attributes as observableAttributes,
  savedObject as observableSavedObject,
} from '../../services/observables/test_utils';
import { toObservable } from '../../services/observables/utils';
import { mockCases } from '../../mocks';
import {
  CASE_OBSERVABLE_SAVED_OBJECT,
  OBSERVABLE_TYPE_HOSTNAME,
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_IPV6,
  MAX_OBSERVABLE_DESCRIPTION_LENGTH,
  MAX_OBSERVABLE_VALUE_LENGTH,
  MAX_OBSERVABLES_PER_CASE,
  OBSERVABILITY_OWNER,
} from '../../../common/constants';
import type { ObservablePost } from '../../../common/types/api';
import type { Observable } from '../../../common/types/domain';
import { UserActionTypes } from '../../../common/types/domain/user_action/v1';

const caseSO = mockCases[0];

const mockCasesClient = createCasesClientMock();
const mockClientArgs = createCasesClientMockArgs();

const mockLicensingService = mockClientArgs.services.licensingService;
const mockCaseService = mockClientArgs.services.caseService;
const mockUserActionService = mockClientArgs.services.userActionService;

const mockObservablePost = {
  value: '127.0.0.1',
  typeKey: OBSERVABLE_TYPE_IPV4.key,
  description: null,
};
const mockObservable = {
  ...mockObservablePost,
  id: '5c431380-c6ef-459f-b0fe-1699e978517b',
  createdAt: '2024-12-05',
  updatedAt: '2024-12-05',
};
const mockObservable2 = {
  ...mockObservablePost,
  id: '6d542491-d7fg-560g-c1gf-2700f089628c',
  createdAt: '2024-12-06',
  updatedAt: '2024-12-06',
};
const mockObservable3 = {
  ...mockObservablePost,
  id: '7e6535a2-e8gh-671h-d2hg-3811g190739d',
  createdAt: '2024-12-07',
  updatedAt: '2024-12-07',
  value: '192.168.0.1',
};
const caseSOWithObservables = {
  ...caseSO,
  attributes: {
    ...caseSO.attributes,
    observables: [mockObservable],
  },
};
const caseSOWithMultipleObservables = {
  ...caseSO,
  attributes: {
    ...caseSO.attributes,
    observables: [mockObservable, mockObservable2, mockObservable3],
  },
};
describe('addObservable', () => {
  beforeEach(() => {
    mockCaseService.patchCase.mockResolvedValue(caseSO);
    mockCaseService.getCase.mockResolvedValue(caseSO);
    jest.clearAllMocks();
  });

  it('should add an observable successfully', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    const result = await addObservable(
      'case-id',
      { observable: { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '127.0.0.1', description: '' } },
      mockClientArgs,
      mockCasesClient
    );

    expect(mockLicensingService.notifyUsage).toHaveBeenCalledWith(
      LICENSING_CASE_OBSERVABLES_FEATURE
    );
    expect(result).toBeDefined();
  });

  it('should throw an error if license is not platinum', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(false);

    await expect(
      addObservable(
        'case-id',
        { observable: { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '127.0.0.1', description: '' } },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow(
      Boom.forbidden(
        'In order to assign observables to cases, you must be subscribed to an Elastic Platinum license'
      )
    );
  });

  it('should throw an error if the value is not valid', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);

    await expect(
      addObservable(
        'case-id',
        { observable: { typeKey: OBSERVABLE_TYPE_IPV4.key, value: 'not an ip', description: '' } },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow(
      Boom.forbidden(
        'Failed to add observable: Error: Observable value "not an ip" is not valid for selected observable type observable-type-ipv4.'
      )
    );
  });

  it('should throw an error if observable type is invalid', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);

    await expect(
      addObservable(
        'case-id',
        { observable: { typeKey: 'invalid type', value: '127.0.0.1', description: '' } },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow(
      Boom.badRequest(
        'Failed to add observable: Error: Invalid observable type, key does not exist: invalid type'
      )
    );
  });

  it('should throw an error if duplicate observable is posted', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);

    mockCaseService.getCase.mockResolvedValue(caseSOWithObservables);

    await expect(
      addObservable(
        'case-id',
        { observable: { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '127.0.0.1', description: '' } },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow(
      Boom.badRequest('Failed to add observable: Error: Invalid duplicated observables in request.')
    );
  });

  it('adds a new observable when stored observables contain duplicates', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    const duplicateStoredObservable = { ...mockObservable, id: 'duplicate-observable-id' };
    mockCaseService.getCase.mockResolvedValue({
      ...caseSO,
      attributes: {
        ...caseSO.attributes,
        observables: [mockObservable, duplicateStoredObservable],
      },
    });

    await addObservable(
      caseSO.id,
      {
        observable: {
          typeKey: OBSERVABLE_TYPE_IPV4.key,
          value: '192.168.0.1',
          description: '',
        },
      },
      mockClientArgs,
      mockCasesClient
    );

    expect(mockCaseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedAttributes: {
          observables: expect.arrayContaining([
            mockObservable,
            duplicateStoredObservable,
            expect.objectContaining({
              typeKey: OBSERVABLE_TYPE_IPV4.key,
              value: '192.168.0.1',
            }),
          ]),
          total_observables: 3,
        },
      })
    );
  });

  it('should handle errors and throw boom', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    mockCaseService.getCase.mockRejectedValue(new Error('Case not found'));

    await expect(
      addObservable(
        'case-id',
        { observable: { typeKey: 'typeKey', value: 'test', description: '' } },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow();
  });

  it('should create a user action with the correct payload', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    await addObservable(
      caseSO.id,
      { observable: { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '127.0.0.1', description: '' } },
      mockClientArgs,
      mockCasesClient
    );

    expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledWith({
      userAction: {
        type: UserActionTypes.observables,
        caseId: caseSO.id,
        owner: 'securitySolution',
        user: mockClientArgs.user,
        payload: { observables: { count: 1, actionType: 'add' } },
      },
    });
  });

  it('emits the observablesAdded event with the new observable', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    await addObservable(
      caseSO.id,
      { observable: { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '127.0.0.1', description: '' } },
      mockClientArgs,
      mockCasesClient
    );

    expect(mockClientArgs.casesEventBus.emitObservablesAdded).toHaveBeenCalledTimes(1);
    expect(mockClientArgs.casesEventBus.emitObservablesAdded).toHaveBeenCalledWith(
      mockClientArgs.request,
      expect.objectContaining({
        caseId: caseSO.id,
        owner: 'securitySolution',
        observableIds: expect.arrayContaining([expect.any(String)]),
        observableTypeKeys: [OBSERVABLE_TYPE_IPV4.key],
      })
    );
  });

  it('does not include observable value or description in the emitted payload', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    await addObservable(
      caseSO.id,
      { observable: { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '127.0.0.1', description: '' } },
      mockClientArgs,
      mockCasesClient
    );

    const [[, payload]] = (mockClientArgs.casesEventBus.emitObservablesAdded as jest.Mock).mock
      .calls;
    expect(payload).not.toHaveProperty('value');
    expect(payload).not.toHaveProperty('description');
    expect(payload).not.toHaveProperty('observables');
  });

  it('does not emit the observablesAdded event when a duplicate is submitted', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    mockCaseService.getCase.mockResolvedValue(caseSOWithObservables);

    // Duplicate — same typeKey + value as the existing observable
    await expect(
      addObservable(
        caseSO.id,
        {
          observable: {
            typeKey: OBSERVABLE_TYPE_IPV4.key,
            value: '127.0.0.1',
            description: '',
          },
        },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow();

    expect(mockClientArgs.casesEventBus.emitObservablesAdded).not.toHaveBeenCalled();
  });

  it('does not emit when the persisted case fails response validation', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    mockCaseService.patchCase.mockResolvedValue({
      ...caseSO,
      attributes: { ...caseSO.attributes, owner: null },
    } as never);

    await expect(
      addObservable(
        caseSO.id,
        {
          observable: {
            typeKey: OBSERVABLE_TYPE_IPV4.key,
            value: '127.0.0.1',
            description: '',
          },
        },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow();

    expect(mockCaseService.patchCase).toHaveBeenCalled();
    expect(mockClientArgs.casesEventBus.emitObservablesAdded).not.toHaveBeenCalled();
  });
});

describe('updateObservable', () => {
  beforeEach(() => {
    mockCaseService.patchCase.mockResolvedValue(caseSOWithObservables);
    mockCaseService.getCase.mockResolvedValue(caseSOWithObservables);
    jest.clearAllMocks();
  });

  it('should update an observable successfully', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    const result = await updateObservable(
      'case-id',
      mockObservable.id,
      {
        observable: {
          value: '192.168.0.1',
          description: 'Updated description',
        },
      },
      mockClientArgs,
      mockCasesClient
    );

    expect(mockLicensingService.notifyUsage).toHaveBeenCalledWith(
      LICENSING_CASE_OBSERVABLES_FEATURE
    );
    expect(result).toBeDefined();
  });

  it('should not update an observable when the provided value is not valid', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    await expect(
      updateObservable(
        'case-id',
        mockObservable.id,
        {
          observable: {
            value: 'not an ip',
            description: 'Updated description',
          },
        },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow(
      Boom.forbidden(
        'Failed to update observable: Error: Observable value "not an ip" is not valid for selected observable type observable-type-ipv4.'
      )
    );
  });

  it('should throw an error if license is not platinum', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(false);

    await expect(
      updateObservable(
        'case-id',
        'observable-id',
        {
          observable: {
            value: '192.168.0.1',
            description: 'Updated description',
          },
        },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow(
      Boom.forbidden(
        'In order to update observables in cases, you must be subscribed to an Elastic Platinum license'
      )
    );
  });

  it('should handle errors and throw boom', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    mockCaseService.getCase.mockRejectedValue(new Error('Case not found'));

    await expect(
      updateObservable(
        'case-id',
        'observable-id',
        { observable: { value: 'test', description: 'Updated description' } },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow();
  });

  it('should create a user action with the correct payload', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    await updateObservable(
      caseSO.id,
      mockObservable.id,
      { observable: { value: '192.168.0.1', description: 'Updated description' } },
      mockClientArgs,
      mockCasesClient
    );

    expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledWith({
      userAction: {
        type: UserActionTypes.observables,
        caseId: caseSO.id,
        owner: 'securitySolution',
        user: mockClientArgs.user,
        payload: { observables: { count: 1, actionType: 'update' } },
      },
    });
  });
});

describe('deleteObservable', () => {
  beforeEach(() => {
    mockCaseService.patchCase.mockResolvedValue(caseSOWithObservables);
    mockCaseService.getCase.mockResolvedValue(caseSOWithObservables);
    jest.clearAllMocks();
  });

  it('should delete an observable successfully', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    await deleteObservable('case-id', mockObservable.id, mockClientArgs, mockCasesClient);

    expect(mockLicensingService.notifyUsage).toHaveBeenCalledWith(
      LICENSING_CASE_OBSERVABLES_FEATURE
    );
  });

  it('should throw an error if license is not platinum', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(false);

    await expect(
      deleteObservable('case-id', 'observable-id', mockClientArgs, mockCasesClient)
    ).rejects.toThrow(
      Boom.forbidden(
        'In order to delete observables from cases, you must be subscribed to an Elastic Platinum license'
      )
    );
  });

  it('should handle errors and throw boom', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    mockCaseService.getCase.mockRejectedValue(new Error('Case not found'));

    await expect(
      deleteObservable('case-id', 'observable-id', mockClientArgs, mockCasesClient)
    ).rejects.toThrow();
  });

  it('should create a user action with the correct payload', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    await deleteObservable(caseSO.id, mockObservable.id, mockClientArgs, mockCasesClient);

    expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledWith({
      userAction: {
        type: UserActionTypes.observables,
        caseId: caseSO.id,
        owner: 'securitySolution',
        user: mockClientArgs.user,
        payload: { observables: { count: 1, actionType: 'delete' } },
      },
    });
  });
});

describe('bulkAddObservables', () => {
  beforeEach(() => {
    mockCaseService.patchCase.mockResolvedValue(caseSOWithObservables);
    mockCaseService.getCase.mockResolvedValue(caseSOWithObservables);
    jest.clearAllMocks();
  });

  const createObservableMatcher = (observable: ObservablePost) =>
    expect.objectContaining({ typeKey: observable.typeKey, value: observable.value });

  it('should bulk add observables successfully', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    const observables = [
      { typeKey: OBSERVABLE_TYPE_IPV4.key, value: 'ip1', description: '' },
      { typeKey: OBSERVABLE_TYPE_IPV6.key, value: 'ip2', description: '' },
    ];
    const result = await bulkAddObservables(
      {
        caseId: 'case-id',
        observables,
      },
      mockClientArgs,
      mockCasesClient
    );
    expect(result).toBeDefined();

    const expectedObservables = [mockObservable, observables[0], observables[1]];
    expect(mockCaseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedAttributes: expect.objectContaining({
          observables: expect.arrayContaining(
            expectedObservables.map((observable) =>
              expect.objectContaining({ typeKey: observable.typeKey, value: observable.value })
            )
          ),
        }),
      })
    );
  });

  it('should throw an error if license is not platinum', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(false);
    await expect(
      bulkAddObservables(
        { caseId: 'case-id', observables: [mockObservablePost] },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow(
      Boom.forbidden(
        'In order to assign observables to cases, you must be subscribed to an Elastic Platinum license'
      )
    );
  });

  it('should handle errors and throw boom', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    mockCaseService.getCase.mockRejectedValue(new Error('Case not found'));
    await expect(
      bulkAddObservables(
        { caseId: 'case-id', observables: [mockObservablePost] },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow();
  });

  it('does not emit when the persisted case fails response validation', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    mockCaseService.patchCase.mockResolvedValue({
      ...caseSOWithObservables,
      attributes: { ...caseSOWithObservables.attributes, owner: null },
    } as never);

    await expect(
      bulkAddObservables(
        {
          caseId: caseSO.id,
          observables: [
            {
              ...mockObservablePost,
              value: '192.168.0.1',
            },
          ],
        },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow();

    expect(mockCaseService.patchCase).toHaveBeenCalled();
    expect(mockClientArgs.casesEventBus.emitObservablesAdded).not.toHaveBeenCalled();
  });

  it('should return the max number of observables', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    const moreThanMaxObservables = [];
    for (let i = 0; i < MAX_OBSERVABLES_PER_CASE; i++) {
      moreThanMaxObservables.push({ ...mockObservablePost, value: `192.168.0.${i}` });
    }
    await bulkAddObservables(
      { caseId: 'case-id', observables: moreThanMaxObservables },
      mockClientArgs,
      mockCasesClient
    );

    const expectedObservables = [
      mockObservable,
      // offset by one to account for the existing observable in the case
      ...moreThanMaxObservables.slice(0, MAX_OBSERVABLES_PER_CASE - 1),
    ];
    const excludedObservable = moreThanMaxObservables[moreThanMaxObservables.length - 1];

    expect(mockCaseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedAttributes: expect.objectContaining({
          observables: expect.arrayContaining(expectedObservables.map(createObservableMatcher)),
        }),
      })
    );
    expect(mockCaseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedAttributes: expect.objectContaining({
          observables: expect.not.arrayContaining([createObservableMatcher(excludedObservable)]),
        }),
      })
    );
  });

  it('should create a user action with the correct payload', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    await bulkAddObservables(
      {
        caseId: caseSO.id,
        observables: [
          { ...mockObservablePost, value: 'ip2' },
          { ...mockObservablePost, value: 'ip3' },
        ],
      },
      mockClientArgs,
      mockCasesClient
    );

    expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledWith({
      userAction: {
        type: UserActionTypes.observables,
        caseId: caseSO.id,
        owner: 'securitySolution',
        user: mockClientArgs.user,
        payload: { observables: { count: 2, actionType: 'add' } },
      },
    });
  });

  it('emits observableTypeKeys index-aligned with observableIds for a multi-type batch', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    // caseSO starts with no observables so all three are new
    mockCaseService.getCase.mockResolvedValue({
      ...caseSO,
      attributes: { ...caseSO.attributes, observables: [] },
    });

    await bulkAddObservables(
      {
        caseId: caseSO.id,
        observables: [
          { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '1.1.1.1', description: '' },
          { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '2.2.2.2', description: '' },
          { typeKey: OBSERVABLE_TYPE_IPV6.key, value: '::1', description: '' },
        ],
      },
      mockClientArgs,
      mockCasesClient
    );

    expect(mockClientArgs.casesEventBus.emitObservablesAdded).toHaveBeenCalledTimes(1);
    const [[, payload]] = (mockClientArgs.casesEventBus.emitObservablesAdded as jest.Mock).mock
      .calls;

    expect(payload.observableIds).toHaveLength(3);
    expect(payload.observableTypeKeys).toHaveLength(3);
    // Both arrays are index-aligned: observableTypeKeys[i] matches observableIds[i].
    expect(payload.observableTypeKeys).toEqual([
      OBSERVABLE_TYPE_IPV4.key,
      OBSERVABLE_TYPE_IPV4.key,
      OBSERVABLE_TYPE_IPV6.key,
    ]);
  });
});

describe('bulkDeleteObservables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCaseService.patchCase.mockResolvedValue(caseSOWithMultipleObservables);
    mockCaseService.getCase.mockResolvedValue(caseSOWithMultipleObservables);
    mockClientArgs.authorization.ensureAuthorized.mockResolvedValue(undefined);
  });

  it('should bulk delete all requested observables when all ids exist', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);

    const result = await bulkDeleteObservables(
      {
        caseId: caseSO.id,
        observableIds: [mockObservable.id, mockObservable2.id],
      },
      mockClientArgs
    );

    expect(mockLicensingService.notifyUsage).toHaveBeenCalledWith(
      LICENSING_CASE_OBSERVABLES_FEATURE
    );
    expect(result).toBeDefined();
    expect(mockCaseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({
        version: caseSOWithMultipleObservables.version,
        updatedAttributes: {
          observables: [mockObservable3],
          total_observables: 1,
        },
      })
    );
  });

  it('should remove only one entry when the same id is requested twice', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);

    await bulkDeleteObservables(
      {
        caseId: caseSO.id,
        observableIds: [mockObservable.id, mockObservable.id],
      },
      mockClientArgs
    );

    expect(mockCaseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedAttributes: {
          observables: [mockObservable2, mockObservable3],
          total_observables: 2,
        },
      })
    );
  });

  it('should throw 404 when any of the requested ids does not exist', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);

    await expect(
      bulkDeleteObservables(
        {
          caseId: caseSO.id,
          observableIds: [mockObservable.id, 'missing-observable-id'],
        },
        mockClientArgs
      )
    ).rejects.toThrow(
      Boom.notFound(
        'Failed to bulk delete observables: observable ids not found: missing-observable-id'
      )
    );

    expect(mockCaseService.patchCase).not.toHaveBeenCalled();
    expect(mockUserActionService.creator.createUserAction).not.toHaveBeenCalled();
  });

  it('should throw 404 when none of the requested ids exist', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);

    await expect(
      bulkDeleteObservables(
        {
          caseId: caseSO.id,
          observableIds: ['missing-id-1', 'missing-id-2'],
        },
        mockClientArgs
      )
    ).rejects.toThrow(
      Boom.notFound(
        'Failed to bulk delete observables: observable ids not found: missing-id-1, missing-id-2'
      )
    );

    expect(mockCaseService.patchCase).not.toHaveBeenCalled();
    expect(mockUserActionService.creator.createUserAction).not.toHaveBeenCalled();
  });

  it('should throw an error if license is not platinum', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(false);

    await expect(
      bulkDeleteObservables(
        {
          caseId: caseSO.id,
          observableIds: [mockObservable.id],
        },
        mockClientArgs
      )
    ).rejects.toThrow(
      Boom.forbidden(
        'In order to delete observables from cases, you must be subscribed to an Elastic Platinum license'
      )
    );
  });

  it('should throw when the user is unauthorized', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    mockClientArgs.authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

    await expect(
      bulkDeleteObservables(
        {
          caseId: caseSO.id,
          observableIds: [mockObservable.id],
        },
        mockClientArgs
      )
    ).rejects.toThrow('Unauthorized');

    expect(mockCaseService.patchCase).not.toHaveBeenCalled();
  });

  it('should create a user action with the count of removed observables, not requested (duplicate ids)', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);

    await bulkDeleteObservables(
      {
        caseId: caseSOWithMultipleObservables.id,
        observableIds: [mockObservable.id, mockObservable.id],
      },
      mockClientArgs
    );

    expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledWith({
      userAction: {
        type: UserActionTypes.observables,
        caseId: caseSOWithMultipleObservables.id,
        owner: caseSOWithMultipleObservables.attributes.owner,
        user: mockClientArgs.user,
        payload: { observables: { count: 1, actionType: 'delete' } },
      },
    });
  });
});

describe('applyObservablesToCase', () => {
  beforeEach(() => {
    mockCaseService.patchCase.mockResolvedValue(caseSO);
    mockCaseService.getCase.mockResolvedValue(caseSO);
    jest.clearAllMocks();
  });

  it('returns early without hitting the database when observables is empty', async () => {
    await applyObservablesToCase(caseSO.id, [], mockClientArgs);

    expect(mockCaseService.getCase).not.toHaveBeenCalled();
    expect(mockCaseService.patchCase).not.toHaveBeenCalled();
    expect(mockUserActionService.creator.createUserAction).not.toHaveBeenCalled();
  });

  it('patches the case with the new observables', async () => {
    mockCaseService.getCase.mockResolvedValue({
      ...caseSO,
      attributes: { ...caseSO.attributes, observables: [] },
    });

    await applyObservablesToCase(caseSO.id, [mockObservablePost], mockClientArgs);

    expect(mockCaseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: caseSO.id,
        updatedAttributes: expect.objectContaining({
          observables: expect.arrayContaining([
            expect.objectContaining({ value: mockObservablePost.value }),
          ]),
          total_observables: 1,
        }),
      })
    );
  });

  it('deduplicates observables — skips both patchCase and user action when all incoming observables already exist', async () => {
    mockCaseService.getCase.mockResolvedValue({
      ...caseSO,
      attributes: { ...caseSO.attributes, observables: [mockObservable] },
    });

    await applyObservablesToCase(caseSO.id, [mockObservablePost], mockClientArgs);

    // No SO write and no user action because newObservablesCount === 0
    expect(mockCaseService.patchCase).not.toHaveBeenCalled();
    expect(mockUserActionService.creator.createUserAction).not.toHaveBeenCalled();
  });

  it('creates a user action when new observables are added', async () => {
    mockCaseService.getCase.mockResolvedValue({
      ...caseSO,
      attributes: { ...caseSO.attributes, observables: [] },
    });

    await applyObservablesToCase(caseSO.id, [mockObservablePost], mockClientArgs);

    expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledWith({
      userAction: expect.objectContaining({
        type: UserActionTypes.observables,
        caseId: caseSO.id,
        payload: { observables: { count: 1, actionType: 'add' } },
      }),
    });
  });

  it('caps at MAX_OBSERVABLES_PER_CASE', async () => {
    const existingObservables = Array.from({ length: MAX_OBSERVABLES_PER_CASE - 1 }, (_, i) => ({
      ...mockObservable,
      id: `obs-${i}`,
      value: `10.0.0.${i}`,
    }));

    mockCaseService.getCase.mockResolvedValue({
      ...caseSO,
      attributes: { ...caseSO.attributes, observables: existingObservables },
    });

    const extraObservables: ObservablePost[] = [
      { value: '192.168.1.1', typeKey: OBSERVABLE_TYPE_IPV4.key, description: null },
      { value: '192.168.1.2', typeKey: OBSERVABLE_TYPE_IPV4.key, description: null },
    ];

    await applyObservablesToCase(caseSO.id, extraObservables, mockClientArgs);

    expect(mockCaseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedAttributes: expect.objectContaining({
          total_observables: MAX_OBSERVABLES_PER_CASE,
        }),
      })
    );
  });

  it('returns the newly-added observables so callers can emit with only the new ids', async () => {
    mockCaseService.getCase.mockResolvedValue({
      ...caseSO,
      attributes: { ...caseSO.attributes, observables: [mockObservable] },
    });

    const newObservable: ObservablePost = {
      value: '10.0.0.1',
      typeKey: OBSERVABLE_TYPE_IPV4.key,
      description: null,
    };

    const result = await applyObservablesToCase(
      caseSO.id,
      [mockObservablePost, newObservable], // mockObservablePost is a duplicate
      mockClientArgs
    );

    // Only the new observable id — not the existing one
    expect(result).toMatchObject({
      status: 'added',
      newlyAddedObservables: [{ value: newObservable.value }],
    });
    // applyObservablesToCase no longer emits; callers are responsible for that
    expect(mockClientArgs.casesEventBus.emitObservablesAdded).not.toHaveBeenCalled();
  });

  it('still writes and returns correct result when stored observables have duplicate typeKey+value entries', async () => {
    // Reachable via SO import or data written before the dedupe path was added.
    // Both stored rows must be preserved — the new observable is appended, not
    // substituted for one of the duplicates.
    const dupA = { ...mockObservable, id: 'dup-a' };
    const dupB = { ...mockObservable, id: 'dup-b' }; // same typeKey+value as dupA

    mockCaseService.getCase.mockResolvedValue({
      ...caseSO,
      attributes: { ...caseSO.attributes, observables: [dupA, dupB] },
    });

    const newObservable: ObservablePost = {
      value: '10.0.0.2',
      typeKey: OBSERVABLE_TYPE_IPV4.key,
      description: null,
    };

    const result = await applyObservablesToCase(caseSO.id, [newObservable], mockClientArgs);

    expect(mockCaseService.patchCase).toHaveBeenCalledTimes(1);
    expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledTimes(1);

    // Both dup-a and dup-b survive; the new observable is appended (3 total).
    const writtenObservables = mockCaseService.patchCase.mock.calls[0][0].updatedAttributes
      .observables as Observable[];
    expect(writtenObservables).toHaveLength(3);
    expect(writtenObservables.map(({ id }) => id)).toEqual(
      expect.arrayContaining(['dup-a', 'dup-b'])
    );
    expect(writtenObservables.some(({ value }) => value === newObservable.value)).toBe(true);

    expect(result).toMatchObject({
      status: 'added',
      newlyAddedObservables: [{ value: newObservable.value }],
    });
  });

  it('reports nothing new when all observables are duplicates', async () => {
    mockCaseService.getCase.mockResolvedValue({
      ...caseSO,
      attributes: { ...caseSO.attributes, observables: [mockObservable] },
    });

    // All duplicates — applyObservablesToCase returns early before the patch
    const result = await applyObservablesToCase(caseSO.id, [mockObservablePost], mockClientArgs);

    expect(result).toEqual({ status: 'skipped', reason: 'nothing_new' });
    expect(mockCaseService.patchCase).not.toHaveBeenCalled();
  });

  it('reports nothing new when the input is empty', async () => {
    const result = await applyObservablesToCase(caseSO.id, [], mockClientArgs);

    expect(result).toEqual({ status: 'skipped', reason: 'nothing_new' });
  });

  it('reports the limit and adds nothing when the case is already at the cap', async () => {
    const atCapObservables = Array.from({ length: MAX_OBSERVABLES_PER_CASE }, (_, i) => ({
      ...mockObservable,
      id: `obs-${i}`,
      value: `10.0.0.${i}`,
    }));

    mockCaseService.getCase.mockResolvedValue({
      ...caseSO,
      attributes: { ...caseSO.attributes, observables: atCapObservables },
    });

    const result = await applyObservablesToCase(
      caseSO.id,
      [{ value: '192.168.99.1', typeKey: OBSERVABLE_TYPE_IPV4.key, description: null }],
      mockClientArgs
    );

    expect(result).toEqual({ status: 'skipped', reason: 'limit_reached' });
    expect(mockCaseService.patchCase).not.toHaveBeenCalled();
    expect(mockUserActionService.creator.createUserAction).not.toHaveBeenCalled();
  });
});

describe('optimistic concurrency on observable writes', () => {
  const versionedCase = (version: string, observables: Observable[]) => ({
    ...caseSO,
    version,
    attributes: { ...caseSO.attributes, observables },
  });
  const conflictError = () => SavedObjectsErrorHelpers.createConflictError('cases', caseSO.id);
  const newObservablePost: ObservablePost = {
    value: '192.168.1.1',
    typeKey: OBSERVABLE_TYPE_IPV4.key,
    description: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCaseService.getCase.mockReset();
    mockCaseService.patchCase.mockReset();
    mockCaseService.patchCase.mockResolvedValue(caseSO);
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    mockClientArgs.authorization.ensureAuthorized.mockResolvedValue(undefined);
  });

  describe('the case version is sent on every write', () => {
    it('applyObservablesToCase', async () => {
      mockCaseService.getCase.mockResolvedValue(versionedCase('v-add', []));

      await applyObservablesToCase(caseSO.id, [newObservablePost], mockClientArgs);

      expect(mockCaseService.patchCase).toHaveBeenCalledWith(
        expect.objectContaining({ version: 'v-add' })
      );
    });

    it('addObservable', async () => {
      mockCaseService.getCase.mockResolvedValue(versionedCase('v-add-one', []));

      await addObservable(
        caseSO.id,
        { observable: newObservablePost },
        mockClientArgs,
        mockCasesClient
      );

      expect(mockCaseService.patchCase).toHaveBeenCalledWith(
        expect.objectContaining({ version: 'v-add-one' })
      );
    });

    it('bulkAddObservables', async () => {
      mockCaseService.getCase.mockResolvedValue(versionedCase('v-bulk-add', []));

      await bulkAddObservables(
        { caseId: caseSO.id, observables: [newObservablePost] },
        mockClientArgs,
        mockCasesClient
      );

      expect(mockCaseService.patchCase).toHaveBeenCalledWith(
        expect.objectContaining({ version: 'v-bulk-add' })
      );
    });

    it('updateObservable', async () => {
      mockCaseService.getCase.mockResolvedValue(versionedCase('v-update', [mockObservable]));

      await updateObservable(
        caseSO.id,
        mockObservable.id,
        { observable: { value: '192.168.0.9', description: null } },
        mockClientArgs,
        mockCasesClient
      );

      expect(mockCaseService.patchCase).toHaveBeenCalledWith(
        expect.objectContaining({ version: 'v-update' })
      );
    });

    it('deleteObservable', async () => {
      mockCaseService.getCase.mockResolvedValue(versionedCase('v-delete', [mockObservable]));

      await deleteObservable(caseSO.id, mockObservable.id, mockClientArgs, mockCasesClient);

      expect(mockCaseService.patchCase).toHaveBeenCalledWith(
        expect.objectContaining({ version: 'v-delete' })
      );
    });

    it('bulkDeleteObservables', async () => {
      mockCaseService.getCase.mockResolvedValue(versionedCase('v-bulk-delete', [mockObservable]));

      await bulkDeleteObservables(
        { caseId: caseSO.id, observableIds: [mockObservable.id] },
        mockClientArgs
      );

      expect(mockCaseService.patchCase).toHaveBeenCalledWith(
        expect.objectContaining({ version: 'v-bulk-delete' })
      );
    });
  });

  describe('over-length requests', () => {
    // Failure scenario: a request above the bounds must be rejected before the case is read or written.
    it('rejects an add whose value exceeds the maximum length', async () => {
      await expect(
        addObservable(
          caseSO.id,
          {
            observable: {
              ...newObservablePost,
              value: 'a'.repeat(MAX_OBSERVABLE_VALUE_LENGTH + 1),
            },
          },
          mockClientArgs,
          mockCasesClient
        )
      ).rejects.toThrow('Failed to add observable');

      expect(mockCaseService.getCase).not.toHaveBeenCalled();
      expect(mockCaseService.patchCase).not.toHaveBeenCalled();
    });

    it('rejects a bulk add whose description exceeds the maximum length', async () => {
      await expect(
        bulkAddObservables(
          {
            caseId: caseSO.id,
            observables: [
              {
                ...newObservablePost,
                description: 'a'.repeat(MAX_OBSERVABLE_DESCRIPTION_LENGTH + 1),
              },
            ],
          },
          mockClientArgs,
          mockCasesClient
        )
      ).rejects.toThrow('Failed to add observable');

      expect(mockCaseService.patchCase).not.toHaveBeenCalled();
    });

    it('rejects an update that changes the value to one over the maximum length', async () => {
      mockCaseService.getCase.mockResolvedValue(versionedCase('v1', [mockObservable]));

      await expect(
        updateObservable(
          caseSO.id,
          mockObservable.id,
          {
            observable: { value: 'a'.repeat(MAX_OBSERVABLE_VALUE_LENGTH + 1), description: null },
          },
          mockClientArgs,
          mockCasesClient
        )
      ).rejects.toThrow(
        `The observable value cannot be longer than ${MAX_OBSERVABLE_VALUE_LENGTH} characters.`
      );

      expect(mockCaseService.patchCase).not.toHaveBeenCalled();
    });

    it('rejects an update that changes the description to one over the maximum length', async () => {
      mockCaseService.getCase.mockResolvedValue(versionedCase('v1', [mockObservable]));

      await expect(
        updateObservable(
          caseSO.id,
          mockObservable.id,
          {
            observable: {
              value: mockObservable.value,
              description: 'a'.repeat(MAX_OBSERVABLE_DESCRIPTION_LENGTH + 1),
            },
          },
          mockClientArgs,
          mockCasesClient
        )
      ).rejects.toThrow(
        `The observable description cannot be longer than ${MAX_OBSERVABLE_DESCRIPTION_LENGTH} characters.`
      );

      expect(mockCaseService.patchCase).not.toHaveBeenCalled();
    });

    describe('a stored observable that predates the bounds', () => {
      // Failure scenario: the edit form sends both fields back, so an edit of one field must not be
      // rejected because the other was stored over the bounds before they existed.
      const legacyObservable: Observable = {
        id: 'b1e0c1f4-3a1d-4c55-9a52-8a3d1f0e2c11',
        typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
        value: 'h'.repeat(MAX_OBSERVABLE_VALUE_LENGTH + 1),
        description: 'd'.repeat(MAX_OBSERVABLE_DESCRIPTION_LENGTH + 1),
        createdAt: '2024-12-05',
        updatedAt: null,
      };

      beforeEach(() => {
        mockCaseService.getCase.mockResolvedValue(versionedCase('v1', [legacyObservable]));
      });

      it('accepts a description edit that keeps the over-length value', async () => {
        await updateObservable(
          caseSO.id,
          legacyObservable.id,
          { observable: { value: legacyObservable.value, description: 'triaged' } },
          mockClientArgs,
          mockCasesClient
        );

        expect(mockCaseService.patchCase).toHaveBeenCalledWith(
          expect.objectContaining({
            updatedAttributes: expect.objectContaining({
              observables: [
                expect.objectContaining({
                  value: legacyObservable.value,
                  description: 'triaged',
                }),
              ],
            }),
          })
        );
      });

      it('accepts a value edit that keeps the over-length description', async () => {
        await updateObservable(
          caseSO.id,
          legacyObservable.id,
          { observable: { value: 'host-1', description: legacyObservable.description } },
          mockClientArgs,
          mockCasesClient
        );

        expect(mockCaseService.patchCase).toHaveBeenCalledWith(
          expect.objectContaining({
            updatedAttributes: expect.objectContaining({
              observables: [
                expect.objectContaining({
                  value: 'host-1',
                  description: legacyObservable.description,
                }),
              ],
            }),
          })
        );
      });
    });
  });

  describe('on a version conflict', () => {
    it('re-reads the case and keeps the observable a concurrent writer added', async () => {
      // Failure scenario: an alert auto-extraction wrote mockObservable2 between our read and our write.
      mockCaseService.getCase
        .mockResolvedValueOnce(versionedCase('v1', [mockObservable]))
        .mockResolvedValueOnce(versionedCase('v2', [mockObservable, mockObservable2]));
      mockCaseService.patchCase
        .mockRejectedValueOnce(conflictError())
        .mockResolvedValueOnce(caseSO);

      const result = await applyObservablesToCase(caseSO.id, [newObservablePost], mockClientArgs);

      expect(mockCaseService.patchCase).toHaveBeenCalledTimes(2);
      const [firstWrite, secondWrite] = mockCaseService.patchCase.mock.calls.map(([args]) => args);
      expect(firstWrite.version).toBe('v1');
      expect(firstWrite.updatedAttributes.observables).toHaveLength(2);
      expect(secondWrite.version).toBe('v2');
      expect(secondWrite.updatedAttributes.observables).toEqual([
        mockObservable,
        mockObservable2,
        expect.objectContaining({ value: newObservablePost.value }),
      ]);
      expect(secondWrite.updatedAttributes.total_observables).toBe(3);
      expect(result).toMatchObject({ status: 'added', newlyAddedObservables: [expect.anything()] });
    });

    it('does not write the user action for the failed attempt', async () => {
      mockCaseService.getCase.mockResolvedValue(versionedCase('v1', []));
      mockCaseService.patchCase
        .mockRejectedValueOnce(conflictError())
        .mockResolvedValueOnce(caseSO);

      await applyObservablesToCase(caseSO.id, [newObservablePost], mockClientArgs);

      expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledTimes(1);
    });

    it('skips the write when the refreshed case already holds the observable', async () => {
      // Failure scenario: the concurrent writer added the very same observable, so there is nothing left to add.
      mockCaseService.getCase
        .mockResolvedValueOnce(versionedCase('v1', []))
        .mockResolvedValueOnce(
          versionedCase('v2', [{ ...mockObservable, value: newObservablePost.value }])
        );
      mockCaseService.patchCase.mockRejectedValueOnce(conflictError());

      const result = await applyObservablesToCase(caseSO.id, [newObservablePost], mockClientArgs);

      expect(result).toEqual({ status: 'skipped', reason: 'nothing_new' });
      expect(mockCaseService.patchCase).toHaveBeenCalledTimes(1);
      expect(mockUserActionService.creator.createUserAction).not.toHaveBeenCalled();
    });

    it('fails with a 409 when the refreshed case has a different owner', async () => {
      // Failure scenario: a saved object import overwrote the case with another owner between our read and our write.
      mockCaseService.getCase.mockResolvedValueOnce(versionedCase('v1', [])).mockResolvedValueOnce({
        ...versionedCase('v2', []),
        attributes: { ...caseSO.attributes, owner: OBSERVABILITY_OWNER, observables: [] },
      });
      mockCaseService.patchCase.mockRejectedValueOnce(conflictError());

      const error = await applyObservablesToCase(
        caseSO.id,
        [newObservablePost],
        mockClientArgs
      ).catch((e) => e);

      expect(Boom.isBoom(error, 409)).toBe(true);
      expect(mockCaseService.patchCase).toHaveBeenCalledTimes(1);
      expect(mockUserActionService.creator.createUserAction).not.toHaveBeenCalled();
    });

    it('addObservable reports the limit when the refreshed case is full', async () => {
      // Failure scenario: concurrent writers filled the case between our read and our write.
      const fullCaseObservables = Array.from({ length: MAX_OBSERVABLES_PER_CASE }, (_, i) => ({
        ...mockObservable,
        id: `obs-${i}`,
        value: `10.0.0.${i}`,
      }));
      mockCaseService.getCase
        .mockResolvedValueOnce(versionedCase('v1', fullCaseObservables.slice(1)))
        .mockResolvedValueOnce(versionedCase('v2', fullCaseObservables));
      mockCaseService.patchCase.mockRejectedValueOnce(conflictError());

      await expect(
        addObservable(caseSO.id, { observable: newObservablePost }, mockClientArgs, mockCasesClient)
      ).rejects.toThrow(`Max ${MAX_OBSERVABLES_PER_CASE} observables per case is allowed.`);
      expect(mockCaseService.patchCase).toHaveBeenCalledTimes(1);
    });

    it('updateObservable fails with a 409 when another request changed the same observable', async () => {
      // Failure scenario: a concurrent edit to this observable landed between our read and our write.
      mockCaseService.getCase
        .mockResolvedValueOnce(versionedCase('v1', [mockObservable]))
        .mockResolvedValueOnce(
          versionedCase('v2', [
            { ...mockObservable, value: '10.9.9.9', updatedAt: '2024-12-08T00:00:00.000Z' },
          ])
        );
      mockCaseService.patchCase.mockRejectedValueOnce(conflictError());

      const error = await updateObservable(
        caseSO.id,
        mockObservable.id,
        { observable: { value: '192.168.0.9', description: null } },
        mockClientArgs,
        mockCasesClient
      ).catch((e) => e);

      expect(Boom.isBoom(error, 409)).toBe(true);
      expect(mockCaseService.patchCase).toHaveBeenCalledTimes(1);
      expect(mockUserActionService.creator.createUserAction).not.toHaveBeenCalled();
    });

    it('throws a 409 once the attempts are exhausted, without a user action', async () => {
      // Failure scenario: writers keep winning the race; the request must fail, not overwrite them.
      mockCaseService.getCase.mockResolvedValue(versionedCase('v1', []));
      mockCaseService.patchCase.mockRejectedValue(conflictError());

      const error = await applyObservablesToCase(
        caseSO.id,
        [newObservablePost],
        mockClientArgs
      ).catch((e) => e);

      expect(Boom.isBoom(error, 409)).toBe(true);
      expect(mockCaseService.patchCase).toHaveBeenCalledTimes(3);
      expect(mockUserActionService.creator.createUserAction).not.toHaveBeenCalled();
    });

    it.each([
      [
        'addObservable',
        () =>
          addObservable(
            caseSO.id,
            { observable: newObservablePost },
            mockClientArgs,
            mockCasesClient
          ),
      ],
      [
        'bulkAddObservables',
        () =>
          bulkAddObservables(
            { caseId: caseSO.id, observables: [newObservablePost] },
            mockClientArgs,
            mockCasesClient
          ),
      ],
      [
        'updateObservable',
        () =>
          updateObservable(
            caseSO.id,
            mockObservable.id,
            { observable: { value: '192.168.0.9', description: null } },
            mockClientArgs,
            mockCasesClient
          ),
      ],
      [
        'deleteObservable',
        () => deleteObservable(caseSO.id, mockObservable.id, mockClientArgs, mockCasesClient),
      ],
      [
        'bulkDeleteObservables',
        () =>
          bulkDeleteObservables(
            { caseId: caseSO.id, observableIds: [mockObservable.id] },
            mockClientArgs
          ),
      ],
    ])('%s fails with a 409 once the attempts are exhausted', async (_name, write) => {
      // Failure scenario: the request error wrapper must not turn the conflict into a 400.
      mockCaseService.getCase.mockResolvedValue(versionedCase('v1', [mockObservable]));
      mockCaseService.patchCase.mockRejectedValue(conflictError());

      const error = await write().catch((e) => e);

      expect(Boom.isBoom(error, 409)).toBe(true);
      expect(mockCaseService.patchCase).toHaveBeenCalledTimes(3);
    });

    it('rethrows an error that is not a version conflict without retrying', async () => {
      mockCaseService.getCase.mockResolvedValue(versionedCase('v1', []));
      mockCaseService.patchCase.mockRejectedValue(new Error('write failed'));

      await expect(
        applyObservablesToCase(caseSO.id, [newObservablePost], mockClientArgs)
      ).rejects.toThrow('write failed');

      expect(mockCaseService.patchCase).toHaveBeenCalledTimes(1);
    });

    it('retries bulkDeleteObservables against the refreshed case', async () => {
      mockCaseService.getCase
        .mockResolvedValueOnce(versionedCase('v1', [mockObservable, mockObservable2]))
        .mockResolvedValueOnce(
          versionedCase('v2', [mockObservable, mockObservable2, mockObservable3])
        );
      mockCaseService.patchCase
        .mockRejectedValueOnce(conflictError())
        .mockResolvedValueOnce(caseSO);

      await bulkDeleteObservables(
        { caseId: caseSO.id, observableIds: [mockObservable.id] },
        mockClientArgs
      );

      const [, secondWrite] = mockCaseService.patchCase.mock.calls.map(([args]) => args);
      expect(secondWrite.version).toBe('v2');
      expect(secondWrite.updatedAttributes).toEqual({
        observables: [mockObservable2, mockObservable3],
        total_observables: 2,
      });
      expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledWith({
        userAction: expect.objectContaining({
          payload: { observables: { count: 1, actionType: 'delete' } },
        }),
      });
    });

    it('fails an update with not found when the refreshed case no longer has the observable', async () => {
      // Failure scenario: a concurrent delete removed the observable we were editing.
      mockCaseService.getCase
        .mockResolvedValueOnce(versionedCase('v1', [mockObservable]))
        .mockResolvedValueOnce(versionedCase('v2', []));
      mockCaseService.patchCase.mockRejectedValueOnce(conflictError());

      await expect(
        updateObservable(
          caseSO.id,
          mockObservable.id,
          { observable: { value: '192.168.0.9', description: null } },
          mockClientArgs,
          mockCasesClient
        )
      ).rejects.toThrow(`observable id ${mockObservable.id} not found`);

      expect(mockCaseService.patchCase).toHaveBeenCalledTimes(1);
      expect(mockUserActionService.creator.createUserAction).not.toHaveBeenCalled();
    });

    it('retries updateObservable and keeps the observable a concurrent writer added', async () => {
      mockCaseService.getCase
        .mockResolvedValueOnce(versionedCase('v1', [mockObservable]))
        .mockResolvedValueOnce(versionedCase('v2', [mockObservable, mockObservable2]));
      mockCaseService.patchCase
        .mockRejectedValueOnce(conflictError())
        .mockResolvedValueOnce(caseSO);

      await updateObservable(
        caseSO.id,
        mockObservable.id,
        { observable: { value: '192.168.0.9', description: null } },
        mockClientArgs,
        mockCasesClient
      );

      const [, secondWrite] = mockCaseService.patchCase.mock.calls.map(([args]) => args);
      expect(secondWrite.version).toBe('v2');
      expect(secondWrite.updatedAttributes.observables).toEqual([
        expect.objectContaining({ id: mockObservable.id, value: '192.168.0.9' }),
        mockObservable2,
      ]);
      expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledTimes(1);
    });

    it('retries deleteObservable and keeps the observable a concurrent writer added', async () => {
      mockCaseService.getCase
        .mockResolvedValueOnce(versionedCase('v1', [mockObservable]))
        .mockResolvedValueOnce(versionedCase('v2', [mockObservable, mockObservable2]));
      mockCaseService.patchCase
        .mockRejectedValueOnce(conflictError())
        .mockResolvedValueOnce(caseSO);

      await deleteObservable(caseSO.id, mockObservable.id, mockClientArgs, mockCasesClient);

      const [, secondWrite] = mockCaseService.patchCase.mock.calls.map(([args]) => args);
      expect(secondWrite.version).toBe('v2');
      expect(secondWrite.updatedAttributes).toEqual({
        observables: [mockObservable2],
        total_observables: 1,
      });
      expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledTimes(1);
    });

    it('fails a delete with not found when the refreshed case no longer has the observable', async () => {
      mockCaseService.getCase
        .mockResolvedValueOnce(versionedCase('v1', [mockObservable]))
        .mockResolvedValueOnce(versionedCase('v2', []));
      mockCaseService.patchCase.mockRejectedValueOnce(conflictError());

      await expect(
        deleteObservable(caseSO.id, mockObservable.id, mockClientArgs, mockCasesClient)
      ).rejects.toThrow(`observable id ${mockObservable.id} not found`);

      expect(mockUserActionService.creator.createUserAction).not.toHaveBeenCalled();
    });
  });
});

describe('observable write responses', () => {
  const mockObservableService = mockClientArgs.services.observableService;
  const typeObservable: Observable = {
    id: 'type-1',
    typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
    value: 'host-1',
    description: null,
    createdAt: '2026-11-06T09:30:00.000Z',
    updatedAt: null,
  };

  const patchedObservables = (): Observable[] =>
    mockCaseService.patchCase.mock.calls[0][0].updatedAttributes.observables ?? [];

  beforeEach(() => {
    jest.clearAllMocks();
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    mockClientArgs.authorization.ensureAuthorized.mockResolvedValue(undefined);
    mockCaseService.patchCase.mockImplementation(async ({ originalCase, updatedAttributes }) => ({
      ...originalCase,
      attributes: updatedAttributes,
    }));
    mockObservableService.getter.getPreviews.mockResolvedValue(
      new Map([[caseSO.id, { count: 3, oldest: [typeObservable] }]])
    );
  });

  afterAll(() => {
    mockObservableService.getter.getPreviews.mockResolvedValue(new Map());
  });

  it('addObservable lists the field first, then the oldest objects, and counts both stores', async () => {
    mockCaseService.getCase.mockResolvedValue(caseSOWithObservables);

    const result = await addObservable(
      caseSO.id,
      { observable: { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '10.0.0.9', description: null } },
      mockClientArgs,
      mockCasesClient
    );

    expect(result.observables.map(({ value }) => value)).toEqual([
      mockObservable.value,
      '10.0.0.9',
      typeObservable.value,
    ]);
    expect(result.total_observables).toBe(5);
    expect(mockObservableService.getter.getPreviews).toHaveBeenCalledWith(
      [expect.objectContaining({ id: caseSO.id, observables: patchedObservables() })],
      { ignoreErrors: true }
    );
    expect(patchedObservables().map(({ value }) => value)).toEqual([
      mockObservable.value,
      '10.0.0.9',
    ]);
  });

  it('bulkAddObservables lists the field first, then the oldest objects, and counts both stores', async () => {
    mockCaseService.getCase.mockResolvedValue(caseSOWithObservables);

    const result = await bulkAddObservables(
      {
        caseId: caseSO.id,
        observables: [{ typeKey: OBSERVABLE_TYPE_IPV4.key, value: '10.0.0.9', description: null }],
      },
      mockClientArgs,
      mockCasesClient
    );

    expect(result.observables.map(({ value }) => value)).toEqual([
      mockObservable.value,
      '10.0.0.9',
      typeObservable.value,
    ]);
    expect(result.total_observables).toBe(5);
    expect(patchedObservables().map(({ value }) => value)).toEqual([
      mockObservable.value,
      '10.0.0.9',
    ]);
  });

  it('updateObservable lists the field first, then the oldest objects, and counts both stores', async () => {
    mockCaseService.getCase.mockResolvedValue(caseSOWithObservables);

    const result = await updateObservable(
      caseSO.id,
      mockObservable.id,
      { observable: { value: '10.0.0.9', description: 'Updated' } },
      mockClientArgs,
      mockCasesClient
    );

    expect(result.observables.map(({ id }) => id)).toEqual([mockObservable.id, typeObservable.id]);
    expect(result.total_observables).toBe(4);
    expect(patchedObservables().map(({ id }) => id)).toEqual([mockObservable.id]);
  });

  it('bulkDeleteObservables lists the field first, then the oldest objects, and counts both stores', async () => {
    mockCaseService.getCase.mockResolvedValue(caseSOWithMultipleObservables);

    const result = await bulkDeleteObservables(
      { caseId: caseSO.id, observableIds: [mockObservable2.id] },
      mockClientArgs
    );

    expect(result.observables.map(({ id }) => id)).toEqual([
      mockObservable.id,
      mockObservable3.id,
      typeObservable.id,
    ]);
    expect(result.total_observables).toBe(5);
    expect(patchedObservables().map(({ id }) => id)).toEqual([
      mockObservable.id,
      mockObservable3.id,
    ]);
  });

  /*
   * FAILURE SCENARIO: the preview search fails after an observable write is saved.
   * Symptom: the write succeeds and its response lists the case field's observables only.
   * Log signature: `Failed to get the observables previews of 1 cases` (error, from the service).
   * Trigger: Elasticsearch rejects or times out the search on `.kibana_alerting_cases`.
   * Recovery: none needed; the observablesAdded trigger still fires and the next read lists both stores.
   */
  describe('when the preview fails', () => {
    beforeEach(() => {
      mockObservablesPreviewSearchFailure(mockObservableService);
    });

    it('addObservable succeeds, lists the field alone and emits observablesAdded', async () => {
      mockCaseService.getCase.mockResolvedValue(caseSOWithObservables);

      const result = await addObservable(
        caseSO.id,
        { observable: { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '10.0.0.9', description: null } },
        mockClientArgs,
        mockCasesClient
      );

      expect(result.observables.map(({ value }) => value)).toEqual([
        mockObservable.value,
        '10.0.0.9',
      ]);
      expect(result.total_observables).toBe(2);
      expect(mockClientArgs.casesEventBus.emitObservablesAdded).toHaveBeenCalledTimes(1);
    });

    it('bulkAddObservables succeeds, lists the field alone and emits observablesAdded', async () => {
      mockCaseService.getCase.mockResolvedValue(caseSOWithObservables);

      const result = await bulkAddObservables(
        {
          caseId: caseSO.id,
          observables: [
            { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '10.0.0.9', description: null },
          ],
        },
        mockClientArgs,
        mockCasesClient
      );

      expect(result.observables.map(({ value }) => value)).toEqual([
        mockObservable.value,
        '10.0.0.9',
      ]);
      expect(result.total_observables).toBe(2);
      expect(mockClientArgs.casesEventBus.emitObservablesAdded).toHaveBeenCalledTimes(1);
    });

    it('updateObservable succeeds and lists the field alone', async () => {
      mockCaseService.getCase.mockResolvedValue(caseSOWithObservables);

      const result = await updateObservable(
        caseSO.id,
        mockObservable.id,
        { observable: { value: '10.0.0.9', description: 'Updated' } },
        mockClientArgs,
        mockCasesClient
      );

      expect(result.observables.map(({ id }) => id)).toEqual([mockObservable.id]);
      expect(result.total_observables).toBe(1);
    });

    it('bulkDeleteObservables succeeds and lists the field alone', async () => {
      mockCaseService.getCase.mockResolvedValue(caseSOWithMultipleObservables);

      const result = await bulkDeleteObservables(
        { caseId: caseSO.id, observableIds: [mockObservable2.id] },
        mockClientArgs
      );

      expect(result.observables.map(({ id }) => id)).toEqual([
        mockObservable.id,
        mockObservable3.id,
      ]);
      expect(result.total_observables).toBe(2);
    });
  });
});

describe('observables in either store', () => {
  const mockObservableService = mockClientArgs.services.observableService;
  const { getter: mockObservableGetter } = mockObservableService;

  const typeObservable = (
    id: string,
    overrides: Partial<ObservablePersistedAttributes> = {}
  ): SavedObject<ObservablePersistedAttributes> => ({
    ...observableSavedObject(id, caseSO.id),
    version: `${id}-version`,
    attributes: observableAttributes({
      type_key: OBSERVABLE_TYPE_HOSTNAME.key,
      value: `${id}.example.com`,
      ...overrides,
    }),
  });
  const typeObservable1 = typeObservable('type-1');
  const typeObservable2 = typeObservable('type-2');

  /** Makes the observable service mocks act on an in-memory `cases-observables` store of the case. */
  const holdInType = (...initial: Array<SavedObject<ObservablePersistedAttributes>>) => {
    let stored = [...initial];

    mockObservableGetter.countForCase.mockImplementation(async () => stored.length);
    mockObservableGetter.getForCase.mockImplementation(async (_caseId: string, ids: string[]) => {
      const found = stored.filter(({ id }) => ids.includes(id));
      return { found, missingIds: ids.filter((id) => !found.some((so) => so.id === id)) };
    });
    mockObservableGetter.findExisting.mockImplementation(async (_caseId, keys) =>
      stored
        .filter(({ attributes: { type_key: typeKey, value } }) =>
          keys.some((key) => key.typeKey === typeKey && key.value === value)
        )
        .map(toObservable)
    );
    mockObservableService.bulkDelete.mockImplementation(async (deleted) => {
      stored = stored.filter(({ id }) => !deleted.some((so) => so.id === id));
    });
  };

  const withFieldObservables = (observables: Observable[]) => ({
    ...caseSO,
    attributes: { ...caseSO.attributes, observables },
  });
  const ipv4Post = (value: string): ObservablePost => ({
    typeKey: OBSERVABLE_TYPE_IPV4.key,
    value,
    description: null,
  });
  const patches = () => mockCaseService.patchCase.mock.calls.map(([args]) => args);

  beforeEach(() => {
    jest.clearAllMocks();
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    mockClientArgs.authorization.ensureAuthorized.mockResolvedValue(undefined);
    mockCaseService.getCase.mockReset();
    mockCaseService.getCase.mockResolvedValue(caseSOWithObservables);
    mockCaseService.patchCase.mockReset();
    mockCaseService.patchCase.mockImplementation(async ({ originalCase, updatedAttributes }) => ({
      ...originalCase,
      attributes: updatedAttributes,
    }));
    mockObservableService.update.mockReset();
    holdInType();
  });

  afterAll(() => {
    holdInType();
  });

  describe('adding', () => {
    it('skips values the type holds and adds the rest to the case field', async () => {
      holdInType(typeObservable('held', { type_key: OBSERVABLE_TYPE_IPV4.key, value: '10.0.0.9' }));

      const result = await applyObservablesToCase(
        caseSO.id,
        [ipv4Post('10.0.0.9'), ipv4Post('10.0.0.10')],
        mockClientArgs
      );

      expect(mockObservableGetter.findExisting).toHaveBeenCalledWith(caseSO.id, [
        expect.objectContaining({ value: '10.0.0.9' }),
        expect.objectContaining({ value: '10.0.0.10' }),
      ]);
      expect(patches()).toHaveLength(1);
      expect(patches()[0].updatedAttributes).toEqual({
        observables: [mockObservable, expect.objectContaining({ value: '10.0.0.10' })],
        total_observables: 3,
      });
      expect(result).toMatchObject({
        status: 'added',
        newlyAddedObservables: [{ value: '10.0.0.10' }],
      });
      expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledWith({
        userAction: expect.objectContaining({
          payload: { observables: { count: 1, actionType: 'add' } },
        }),
      });
    });

    it('addObservable rejects a value the type holds', async () => {
      holdInType(typeObservable('held', { type_key: OBSERVABLE_TYPE_IPV4.key, value: '10.0.0.9' }));

      await expect(
        addObservable(
          caseSO.id,
          { observable: ipv4Post('10.0.0.9') },
          mockClientArgs,
          mockCasesClient
        )
      ).rejects.toThrow('Invalid duplicated observables in request.');

      expect(mockCaseService.patchCase).not.toHaveBeenCalled();
      expect(mockUserActionService.creator.createUserAction).not.toHaveBeenCalled();
    });

    it('counts the type against the limit', async () => {
      holdInType(
        ...Array.from({ length: MAX_OBSERVABLES_PER_CASE - 2 }, (_, i) =>
          typeObservable(`type-${i}`)
        )
      );

      const result = await applyObservablesToCase(
        caseSO.id,
        [ipv4Post('10.0.0.9'), ipv4Post('10.0.0.10')],
        mockClientArgs
      );

      expect(patches()[0].updatedAttributes).toEqual({
        observables: [mockObservable, expect.objectContaining({ value: '10.0.0.9' })],
        total_observables: MAX_OBSERVABLES_PER_CASE,
      });
      expect(result).toMatchObject({ status: 'added', newlyAddedObservables: [{}] });
    });

    it('addObservable reports the limit when the type fills the case', async () => {
      mockCaseService.getCase.mockResolvedValue(withFieldObservables([]));
      holdInType(
        ...Array.from({ length: MAX_OBSERVABLES_PER_CASE }, (_, i) => typeObservable(`type-${i}`))
      );

      await expect(
        addObservable(
          caseSO.id,
          { observable: ipv4Post('10.0.0.9') },
          mockClientArgs,
          mockCasesClient
        )
      ).rejects.toThrow(`Max ${MAX_OBSERVABLES_PER_CASE} observables per case is allowed.`);

      expect(mockCaseService.patchCase).not.toHaveBeenCalled();
    });

    it('does not search the type while it holds no objects', async () => {
      await applyObservablesToCase(caseSO.id, [ipv4Post('10.0.0.9')], mockClientArgs);

      expect(mockObservableGetter.countForCase).toHaveBeenCalledWith(caseSO.id);
      expect(mockObservableGetter.findExisting).not.toHaveBeenCalled();
      expect(patches()[0].updatedAttributes.total_observables).toBe(2);
    });

    it('counts and searches the type again when a version conflict forces a retry', async () => {
      // Failure scenario: a release B node writes an object of the type between our read and our write.
      mockObservableGetter.countForCase.mockResolvedValueOnce(0);
      mockObservableGetter.findExisting.mockResolvedValueOnce([
        toObservable(
          typeObservable('held', { type_key: OBSERVABLE_TYPE_IPV4.key, value: '10.0.0.9' })
        ),
      ]);
      mockObservableGetter.countForCase.mockResolvedValueOnce(1);
      mockCaseService.patchCase.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError('cases', caseSO.id)
      );

      await applyObservablesToCase(
        caseSO.id,
        [ipv4Post('10.0.0.9'), ipv4Post('10.0.0.10')],
        mockClientArgs
      );

      const [firstWrite, secondWrite] = patches();
      expect(firstWrite.updatedAttributes.total_observables).toBe(3);
      expect(mockObservableGetter.findExisting).toHaveBeenCalledTimes(1);
      expect(secondWrite.updatedAttributes).toEqual({
        observables: [mockObservable, expect.objectContaining({ value: '10.0.0.10' })],
        total_observables: 3,
      });
    });
  });

  describe('updating an observable of the case field', () => {
    it('rejects a value edit that repeats an observable of the type', async () => {
      holdInType(typeObservable('held', { type_key: OBSERVABLE_TYPE_IPV4.key, value: '10.0.0.9' }));

      await expect(
        updateObservable(
          caseSO.id,
          mockObservable.id,
          { observable: { value: '10.0.0.9', description: null } },
          mockClientArgs,
          mockCasesClient
        )
      ).rejects.toThrow('Invalid duplicated observables in request.');

      expect(mockCaseService.patchCase).not.toHaveBeenCalled();
    });

    it('keeps the observable in the field and stores a total that counts both stores', async () => {
      holdInType(typeObservable1, typeObservable2);

      await updateObservable(
        caseSO.id,
        mockObservable.id,
        { observable: { value: mockObservable.value, description: 'Updated' } },
        mockClientArgs,
        mockCasesClient
      );

      expect(patches()[0].updatedAttributes).toEqual({
        observables: [expect.objectContaining({ id: mockObservable.id, description: 'Updated' })],
        total_observables: 3,
      });
      expect(mockObservableGetter.findExisting).not.toHaveBeenCalled();
      expect(mockObservableService.update).not.toHaveBeenCalled();
    });
  });

  describe('updating an observable of the type', () => {
    it('edits the object in place and stores a total that counts both stores', async () => {
      holdInType(typeObservable1);

      const result = await updateObservable(
        caseSO.id,
        typeObservable1.id,
        { observable: { value: 'renamed.example.com', description: 'Updated' } },
        mockClientArgs,
        mockCasesClient
      );

      expect(mockObservableGetter.getForCase).toHaveBeenCalledWith(caseSO.id, [typeObservable1.id]);
      expect(mockObservableService.update).toHaveBeenCalledWith({
        observable: typeObservable1,
        attributes: {
          value: 'renamed.example.com',
          description: 'Updated',
          updated_at: expect.any(String),
          updated_by: mockClientArgs.user,
        },
      });
      expect(patches()).toHaveLength(1);
      expect(patches()[0]).toMatchObject({
        version: caseSOWithObservables.version,
        updatedAttributes: { total_observables: 2 },
      });
      expect(patches()[0].updatedAttributes).not.toHaveProperty('observables');
      expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledWith({
        userAction: expect.objectContaining({
          payload: { observables: { count: 1, actionType: 'update' } },
        }),
      });
      expect(result.id).toBe(caseSO.id);
    });

    it('rejects a value edit that repeats an observable of the case field', async () => {
      mockCaseService.getCase.mockResolvedValue(
        withFieldObservables([
          { ...mockObservable, typeKey: OBSERVABLE_TYPE_HOSTNAME.key, value: 'field.example.com' },
        ])
      );
      holdInType(typeObservable1);

      await expect(
        updateObservable(
          caseSO.id,
          typeObservable1.id,
          { observable: { value: 'field.example.com', description: null } },
          mockClientArgs,
          mockCasesClient
        )
      ).rejects.toThrow('Invalid duplicated observables in request.');

      expect(mockObservableService.update).not.toHaveBeenCalled();
      expect(mockCaseService.patchCase).not.toHaveBeenCalled();
    });

    it('rejects a value edit that repeats another object of the type', async () => {
      holdInType(typeObservable1, typeObservable2);

      await expect(
        updateObservable(
          caseSO.id,
          typeObservable1.id,
          { observable: { value: typeObservable2.attributes.value, description: null } },
          mockClientArgs,
          mockCasesClient
        )
      ).rejects.toThrow('Invalid duplicated observables in request.');

      expect(mockObservableService.update).not.toHaveBeenCalled();
    });

    it('accepts an edit that keeps the value of the object', async () => {
      holdInType(typeObservable1);

      await updateObservable(
        caseSO.id,
        typeObservable1.id,
        { observable: { value: typeObservable1.attributes.value, description: 'Updated' } },
        mockClientArgs,
        mockCasesClient
      );

      expect(mockObservableGetter.findExisting).not.toHaveBeenCalled();
      expect(mockObservableService.update).toHaveBeenCalledTimes(1);
    });

    it('validates the new value against the type key of the object', async () => {
      holdInType(typeObservable1);

      await expect(
        updateObservable(
          caseSO.id,
          typeObservable1.id,
          { observable: { value: 'not a hostname', description: null } },
          mockClientArgs,
          mockCasesClient
        )
      ).rejects.toThrow(
        `is not valid for selected observable type ${OBSERVABLE_TYPE_HOSTNAME.key}`
      );

      expect(mockObservableService.update).not.toHaveBeenCalled();
    });

    it('fails with a 409 when another request edited the object', async () => {
      // Failure scenario: another node edits the same object between our read and our write.
      holdInType(typeObservable1);
      mockObservableService.update.mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError(
          CASE_OBSERVABLE_SAVED_OBJECT,
          typeObservable1.id
        )
      );

      const error = await updateObservable(
        caseSO.id,
        typeObservable1.id,
        { observable: { value: 'renamed.example.com', description: null } },
        mockClientArgs,
        mockCasesClient
      ).catch((e) => e);

      expect(Boom.isBoom(error, 409)).toBe(true);
      expect(mockCaseService.patchCase).not.toHaveBeenCalled();
      expect(mockUserActionService.creator.createUserAction).not.toHaveBeenCalled();
    });

    it('fails with not found when neither store holds the id', async () => {
      holdInType(typeObservable1);

      await expect(
        updateObservable(
          caseSO.id,
          'missing-id',
          { observable: { value: 'renamed.example.com', description: null } },
          mockClientArgs,
          mockCasesClient
        )
      ).rejects.toThrow('observable id missing-id not found');

      expect(mockObservableService.update).not.toHaveBeenCalled();
      expect(mockCaseService.patchCase).not.toHaveBeenCalled();
    });
  });

  describe('deleting', () => {
    it('deletes an object of the type and stores a total that counts both stores', async () => {
      holdInType(typeObservable1, typeObservable2);

      await deleteObservable(caseSO.id, typeObservable1.id, mockClientArgs, mockCasesClient);

      expect(mockObservableService.bulkDelete).toHaveBeenCalledWith([typeObservable1]);
      expect(patches()).toHaveLength(1);
      expect(patches()[0]).toMatchObject({
        version: caseSOWithObservables.version,
        updatedAttributes: { total_observables: 2 },
      });
      expect(patches()[0].updatedAttributes).not.toHaveProperty('observables');
      expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledWith({
        userAction: expect.objectContaining({
          payload: { observables: { count: 1, actionType: 'delete' } },
        }),
      });
    });

    it('deletes an observable of the case field without touching the type', async () => {
      holdInType(typeObservable1);

      await deleteObservable(caseSO.id, mockObservable.id, mockClientArgs, mockCasesClient);

      expect(mockObservableService.bulkDelete).not.toHaveBeenCalled();
      expect(patches()[0].updatedAttributes).toEqual({ observables: [], total_observables: 1 });
    });

    it('fails with not found when neither store holds the id', async () => {
      holdInType(typeObservable1);

      await expect(
        deleteObservable(caseSO.id, 'missing-id', mockClientArgs, mockCasesClient)
      ).rejects.toThrow('observable id missing-id not found');

      expect(mockObservableService.bulkDelete).not.toHaveBeenCalled();
      expect(mockCaseService.patchCase).not.toHaveBeenCalled();
    });
  });

  describe('bulk deleting', () => {
    beforeEach(() => {
      mockCaseService.getCase.mockResolvedValue(caseSOWithMultipleObservables);
    });

    it('deletes from both stores, then writes the case once with a total that counts both', async () => {
      holdInType(typeObservable1, typeObservable2);

      await bulkDeleteObservables(
        { caseId: caseSO.id, observableIds: [mockObservable3.id, typeObservable1.id] },
        mockClientArgs
      );

      expect(mockObservableGetter.getForCase).toHaveBeenCalledWith(caseSO.id, [typeObservable1.id]);
      expect(mockObservableService.bulkDelete).toHaveBeenCalledWith([typeObservable1]);
      expect(patches()).toHaveLength(1);
      expect(patches()[0].updatedAttributes).toEqual({
        observables: [mockObservable, mockObservable2],
        total_observables: 3,
      });
      expect(mockObservableService.bulkDelete.mock.invocationCallOrder[0]).toBeLessThan(
        mockCaseService.patchCase.mock.invocationCallOrder[0]
      );
      expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledTimes(1);
      expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledWith({
        userAction: expect.objectContaining({
          payload: { observables: { count: 2, actionType: 'delete' } },
        }),
      });
    });

    it('stores only the total when every id is in the type', async () => {
      holdInType(typeObservable1, typeObservable2);

      await bulkDeleteObservables(
        { caseId: caseSO.id, observableIds: [typeObservable1.id, typeObservable2.id] },
        mockClientArgs
      );

      expect(patches()[0].updatedAttributes).toEqual({ total_observables: 3 });
      expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledWith({
        userAction: expect.objectContaining({
          payload: { observables: { count: 2, actionType: 'delete' } },
        }),
      });
    });

    it('fails with not found listing the ids neither store holds and deletes nothing', async () => {
      holdInType(typeObservable1);

      await expect(
        bulkDeleteObservables(
          {
            caseId: caseSO.id,
            observableIds: [mockObservable3.id, typeObservable1.id, 'missing-id'],
          },
          mockClientArgs
        )
      ).rejects.toThrow(
        Boom.notFound('Failed to bulk delete observables: observable ids not found: missing-id')
      );

      expect(mockObservableService.bulkDelete).not.toHaveBeenCalled();
      expect(mockCaseService.patchCase).not.toHaveBeenCalled();
      expect(mockUserActionService.creator.createUserAction).not.toHaveBeenCalled();
    });
  });

  describe('bulkGetObservables', () => {
    beforeEach(() => {
      mockCaseService.getCase.mockResolvedValue(caseSOWithMultipleObservables);
    });

    it('returns the requested observables of both stores and leaves out ids the case does not hold', async () => {
      holdInType(typeObservable1, typeObservable2);

      const result = await bulkGetObservables(
        {
          caseId: caseSO.id,
          observableIds: [mockObservable3.id, typeObservable1.id, 'missing-id'],
        },
        mockClientArgs
      );

      expect(result).toEqual([mockObservable3, toObservable(typeObservable1)]);
      expect(mockObservableGetter.getForCase).toHaveBeenCalledWith(caseSO.id, [
        typeObservable1.id,
        'missing-id',
      ]);
    });

    it('authorizes a read of the observables of the case', async () => {
      await bulkGetObservables(
        { caseId: caseSO.id, observableIds: [mockObservable3.id] },
        mockClientArgs
      );

      expect(mockClientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
        operation: Operations.findObservables,
        entities: [{ id: caseSO.id, owner: caseSO.attributes.owner }],
      });
    });

    it('does not read the type when the user is not authorized', async () => {
      mockClientArgs.authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        bulkGetObservables(
          { caseId: caseSO.id, observableIds: [typeObservable1.id] },
          mockClientArgs
        )
      ).rejects.toThrow('Unauthorized');

      expect(mockObservableGetter.getForCase).not.toHaveBeenCalled();
    });

    it(`rejects more than ${MAX_OBSERVABLES_PER_CASE} ids`, async () => {
      await expect(
        bulkGetObservables(
          {
            caseId: caseSO.id,
            observableIds: Array.from(
              { length: MAX_OBSERVABLES_PER_CASE + 1 },
              (_, i) => `id-${i}`
            ),
          },
          mockClientArgs
        )
      ).rejects.toThrow();

      expect(mockCaseService.getCase).not.toHaveBeenCalled();
    });
  });
});
