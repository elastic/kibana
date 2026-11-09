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
  bulkCreateObservables,
  bulkDeleteObservables,
  applyObservablesToCase,
} from './observables';
import Boom from '@hapi/boom';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { LICENSING_CASE_OBSERVABLES_FEATURE } from '../../common/constants';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { mockCases } from '../../mocks';
import {
  OBSERVABLE_TYPE_HOSTNAME,
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_IPV6,
  MAX_OBSERVABLE_DESCRIPTION_LENGTH,
  MAX_OBSERVABLE_VALUE_LENGTH,
  MAX_STORED_OBSERVABLE_FIELD_LENGTH,
  MAX_STORED_OBSERVABLES_PER_CASE,
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
const mockObservableService = mockClientArgs.services.observableService;

/** The observables an add wrote to the `cases-observables` type, across every bulk create. */
const createdObservables = () =>
  mockObservableService.bulkCreate.mock.calls.flatMap(([{ observables }]) => observables);

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

    expect(createdObservables()).toEqual([
      expect.objectContaining({ typeKey: OBSERVABLE_TYPE_IPV4.key, value: '192.168.0.1' }),
    ]);
    // The field is not rewritten; its two stored rows stay and count toward the total.
    expect(mockCaseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedAttributes: expect.not.objectContaining({ observables: expect.anything() }),
      })
    );
    expect(mockCaseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedAttributes: expect.objectContaining({ total_observables: 2 }),
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

    expect(createdObservables()).toEqual(observables.map(createObservableMatcher));
    expect(mockObservableService.bulkCreate).toHaveBeenCalledWith(
      expect.objectContaining({ caseId: caseSO.id, owner: caseSO.attributes.owner })
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

  it('adds only as many observables as fit under the cap', async () => {
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    // The field holds one observable and the type all but two of the rest, so one more fits.
    mockObservableService.countForCase.mockResolvedValueOnce(MAX_STORED_OBSERVABLES_PER_CASE - 2);
    const observables = [0, 1, 2].map((i) => ({ ...mockObservablePost, value: `192.168.0.${i}` }));

    await bulkAddObservables({ caseId: 'case-id', observables }, mockClientArgs, mockCasesClient);

    expect(createdObservables()).toEqual([createObservableMatcher(observables[0])]);
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
        updatedAttributes: expect.objectContaining({
          observables: [mockObservable3],
          total_observables: 1,
        }),
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
        updatedAttributes: expect.objectContaining({
          observables: [mockObservable2, mockObservable3],
          total_observables: 2,
        }),
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
  const caseWith = (observables: Observable[]) => ({
    ...caseSO,
    attributes: { ...caseSO.attributes, observables },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCaseService.patchCase.mockResolvedValue(caseSO);
    mockCaseService.getCase.mockResolvedValue(caseWith([]));
    mockObservableService.countForCase.mockResolvedValue(0);
    mockObservableService.findExisting.mockResolvedValue([]);
  });

  it('writes nothing when observables is empty', async () => {
    const result = await applyObservablesToCase(caseSO.id, [], mockClientArgs);

    expect(result.caseWithPatch).toBeUndefined();
    expect(mockObservableService.bulkCreate).not.toHaveBeenCalled();
    expect(mockCaseService.patchCase).not.toHaveBeenCalled();
    expect(mockUserActionService.creator.createUserAction).not.toHaveBeenCalled();
  });

  it('writes new observables only as cases-observables objects and sets the stored total', async () => {
    mockObservableService.countForCase.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

    await applyObservablesToCase(caseSO.id, [mockObservablePost], mockClientArgs);

    expect(mockObservableService.bulkCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: caseSO.id,
        owner: caseSO.attributes.owner,
        user: mockClientArgs.user,
        observables: [
          expect.objectContaining({
            id: expect.any(String),
            typeKey: mockObservablePost.typeKey,
            value: mockObservablePost.value,
            description: null,
          }),
        ],
      })
    );
    const [[{ updatedAttributes, version }]] = mockCaseService.patchCase.mock.calls;
    expect(updatedAttributes).not.toHaveProperty('observables');
    expect(updatedAttributes).toEqual(
      expect.objectContaining({
        total_observables: 1,
        updated_at: expect.any(String),
        updated_by: mockClientArgs.user,
      })
    );
    // Adds do not write the case field, so they do not need the case version.
    expect(version).toBeUndefined();
  });

  it('gives the observables of one request increasing created times in request order', async () => {
    const observables = ['10.0.0.1', '10.0.0.2', '10.0.0.3'].map((value) => ({
      ...mockObservablePost,
      value,
    }));

    await applyObservablesToCase(caseSO.id, observables, mockClientArgs);

    const createdAt = createdObservables().map((observable) => Date.parse(observable.createdAt));
    expect(createdAt[1] - createdAt[0]).toBe(1);
    expect(createdAt[2] - createdAt[1]).toBe(1);
  });

  it('skips repeats of the case field, of the type and within the request', async () => {
    mockCaseService.getCase.mockResolvedValue(caseWith([mockObservable]));
    const repeatOfType = { ...mockObservablePost, value: '10.0.0.7' };
    mockObservableService.findExisting.mockResolvedValue([
      { ...mockObservable, id: 'type-obs', value: repeatOfType.value },
    ]);
    const newObservable = { ...mockObservablePost, value: '10.0.0.8' };

    const result = await applyObservablesToCase(
      caseSO.id,
      [mockObservablePost, repeatOfType, newObservable, newObservable],
      mockClientArgs
    );

    expect(createdObservables()).toEqual([expect.objectContaining({ value: newObservable.value })]);
    expect(result.skippedDuplicates).toEqual([mockObservablePost, newObservable, repeatOfType]);
    expect(mockObservableService.findExisting).toHaveBeenCalledWith(caseSO.id, [
      repeatOfType,
      newObservable,
    ]);
  });

  it('treats type keys that contain a dash as distinct', async () => {
    mockCaseService.getCase.mockResolvedValue(
      caseWith([{ ...mockObservable, typeKey: 'a-b', value: 'c' }])
    );

    await applyObservablesToCase(
      caseSO.id,
      [{ typeKey: 'a', value: 'b-c', description: null }],
      mockClientArgs
    );

    expect(createdObservables()).toHaveLength(1);
  });

  it('creates a user action when new observables are added', async () => {
    await applyObservablesToCase(caseSO.id, [mockObservablePost], mockClientArgs);

    expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledWith({
      userAction: expect.objectContaining({
        type: UserActionTypes.observables,
        caseId: caseSO.id,
        payload: { observables: { count: 1, actionType: 'add' } },
      }),
    });
  });

  it('adds only as many as fit under the cap and reports and logs the rest', async () => {
    mockCaseService.getCase.mockResolvedValue(caseWith([mockObservable]));
    mockObservableService.countForCase.mockResolvedValue(MAX_STORED_OBSERVABLES_PER_CASE - 2);

    const extraObservables: ObservablePost[] = [
      { value: '192.168.1.1', typeKey: OBSERVABLE_TYPE_IPV4.key, description: null },
      { value: '192.168.1.2', typeKey: OBSERVABLE_TYPE_IPV4.key, description: null },
    ];

    const result = await applyObservablesToCase(caseSO.id, extraObservables, mockClientArgs);

    expect(createdObservables()).toEqual([expect.objectContaining({ value: '192.168.1.1' })]);
    expect(result.skippedOverCap).toEqual([extraObservables[1]]);
    expect(mockClientArgs.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Skipped 1 observable(s)')
    );
  });

  it('adds nothing, and writes nothing to the case, when the case is already at the cap', async () => {
    mockObservableService.countForCase.mockResolvedValue(MAX_STORED_OBSERVABLES_PER_CASE);

    const result = await applyObservablesToCase(
      caseSO.id,
      [{ value: '192.168.99.1', typeKey: OBSERVABLE_TYPE_IPV4.key, description: null }],
      mockClientArgs
    );

    expect(result.caseWithPatch).toBeUndefined();
    expect(result.skippedOverCap).toHaveLength(1);
    expect(result.totalObservables).toBe(MAX_STORED_OBSERVABLES_PER_CASE);
    expect(mockObservableService.bulkCreate).not.toHaveBeenCalled();
    expect(mockCaseService.patchCase).not.toHaveBeenCalled();
    expect(mockUserActionService.creator.createUserAction).not.toHaveBeenCalled();
  });

  it('checks repeats and the cap before each chunk of 1,000', async () => {
    const observables = Array.from({ length: 1500 }, (_, i) => ({
      ...mockObservablePost,
      value: `10.1.${Math.floor(i / 250)}.${i % 250}`,
    }));

    const result = await applyObservablesToCase(caseSO.id, observables, mockClientArgs);

    expect(mockObservableService.findExisting).toHaveBeenCalledTimes(2);
    expect(mockObservableService.bulkCreate).toHaveBeenCalledTimes(2);
    expect(result.newlyAddedObservables).toHaveLength(1500);
    // One user action for the whole request.
    expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledTimes(1);
  });

  it('returns the newly-added observables so callers can emit with only the new ids', async () => {
    mockCaseService.getCase.mockResolvedValue(caseWith([mockObservable]));

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
    expect(result.newlyAddedObservables).toHaveLength(1);
    expect(result.newlyAddedObservables[0].value).toBe(newObservable.value);
    // applyObservablesToCase no longer emits; callers are responsible for that
    expect(mockClientArgs.casesEventBus.emitObservablesAdded).not.toHaveBeenCalled();
  });

  it('keeps stored field rows that repeat each other and adds the new observable', async () => {
    // Reachable via SO import or data written before the dedupe path was added.
    const dupA = { ...mockObservable, id: 'dup-a' };
    const dupB = { ...mockObservable, id: 'dup-b' }; // same typeKey+value as dupA
    mockCaseService.getCase.mockResolvedValue(caseWith([dupA, dupB]));
    mockObservableService.countForCase.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

    const newObservable: ObservablePost = {
      value: '10.0.0.2',
      typeKey: OBSERVABLE_TYPE_IPV4.key,
      description: null,
    };

    const result = await applyObservablesToCase(caseSO.id, [newObservable], mockClientArgs);

    expect(mockCaseService.patchCase).toHaveBeenCalledTimes(1);
    expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledTimes(1);
    expect(mockCaseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedAttributes: expect.objectContaining({ total_observables: 3 }),
      })
    );
    expect(result.newlyAddedObservables).toHaveLength(1);
    expect(result.newlyAddedObservables[0].value).toBe(newObservable.value);
  });

  it('returns no case when all observables are duplicates', async () => {
    mockCaseService.getCase.mockResolvedValue(caseWith([mockObservable]));

    const result = await applyObservablesToCase(caseSO.id, [mockObservablePost], mockClientArgs);

    expect(result.caseWithPatch).toBeUndefined();
    expect(result.skippedDuplicates).toEqual([mockObservablePost]);
    expect(mockCaseService.patchCase).not.toHaveBeenCalled();
  });
});

describe('bulkCreateObservables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    mockCaseService.getCase.mockResolvedValue(caseSOWithObservables);
    mockCaseService.patchCase.mockResolvedValue(caseSOWithObservables);
    mockObservableService.countForCase.mockResolvedValue(0);
    mockObservableService.findExisting.mockResolvedValue([]);
  });

  it('reports what it added and what it skipped instead of failing', async () => {
    const newObservable = { ...mockObservablePost, value: '10.0.0.9' };

    const result = await bulkCreateObservables(
      caseSO.id,
      { observables: [mockObservablePost, newObservable] },
      mockClientArgs,
      mockCasesClient
    );

    expect(result.added).toEqual([expect.objectContaining({ value: newObservable.value })]);
    expect(result.skipped_duplicates).toEqual([mockObservablePost]);
    expect(result.skipped_over_cap).toEqual([]);
    expect(mockClientArgs.casesEventBus.emitObservablesAdded).toHaveBeenCalledTimes(1);
  });

  it('does not fail or emit when nothing was added', async () => {
    const result = await bulkCreateObservables(
      caseSO.id,
      { observables: [mockObservablePost] },
      mockClientArgs,
      mockCasesClient
    );

    expect(result.added).toEqual([]);
    expect(mockClientArgs.casesEventBus.emitObservablesAdded).not.toHaveBeenCalled();
  });

  it('rejects more than 1,000 observables', async () => {
    const observables = Array.from({ length: 1001 }, (_, i) => ({
      ...mockObservablePost,
      value: `10.2.${Math.floor(i / 250)}.${i % 250}`,
    }));

    await expect(
      bulkCreateObservables(caseSO.id, { observables }, mockClientArgs, mockCasesClient)
    ).rejects.toThrow();
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
    mockObservableService.countForCase.mockResolvedValue(0);
    mockObservableService.findExisting.mockResolvedValue([]);
  });

  describe('adds write only the type, so they do not send the case version', () => {
    it('applyObservablesToCase', async () => {
      mockCaseService.getCase.mockResolvedValue(versionedCase('v-add', []));

      await applyObservablesToCase(caseSO.id, [newObservablePost], mockClientArgs);

      expect(mockCaseService.patchCase.mock.calls[0][0].version).toBeUndefined();
    });

    it('addObservable', async () => {
      mockCaseService.getCase.mockResolvedValue(versionedCase('v-add-one', []));

      await addObservable(
        caseSO.id,
        { observable: newObservablePost },
        mockClientArgs,
        mockCasesClient
      );

      expect(mockCaseService.patchCase.mock.calls[0][0].version).toBeUndefined();
    });

    it('bulkAddObservables', async () => {
      mockCaseService.getCase.mockResolvedValue(versionedCase('v-bulk-add', []));

      await bulkAddObservables(
        { caseId: caseSO.id, observables: [newObservablePost] },
        mockClientArgs,
        mockCasesClient
      );

      expect(mockCaseService.patchCase.mock.calls[0][0].version).toBeUndefined();
    });
  });

  describe('the case version is sent on every write to the case field', () => {
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

    it('rejects an update whose value exceeds the longest a stored value can be', async () => {
      await expect(
        updateObservable(
          caseSO.id,
          mockObservable.id,
          {
            observable: {
              value: 'a'.repeat(MAX_STORED_OBSERVABLE_FIELD_LENGTH + 1),
              description: null,
            },
          },
          mockClientArgs,
          mockCasesClient
        )
      ).rejects.toThrow('Failed to update observable');

      expect(mockCaseService.getCase).not.toHaveBeenCalled();
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

  describe('when an add fails', () => {
    it('records no user action and does not set the total when the type write fails', async () => {
      mockCaseService.getCase.mockResolvedValue(versionedCase('v1', []));
      mockObservableService.bulkCreate.mockRejectedValueOnce(new Error('create failed'));

      await expect(
        applyObservablesToCase(caseSO.id, [newObservablePost], mockClientArgs)
      ).rejects.toThrow('create failed');

      expect(mockCaseService.patchCase).not.toHaveBeenCalled();
      expect(mockUserActionService.creator.createUserAction).not.toHaveBeenCalled();
    });

    it('rethrows an error from setting the stored total', async () => {
      mockCaseService.getCase.mockResolvedValue(versionedCase('v1', []));
      mockCaseService.patchCase.mockRejectedValue(new Error('write failed'));

      await expect(
        applyObservablesToCase(caseSO.id, [newObservablePost], mockClientArgs)
      ).rejects.toThrow('write failed');

      expect(mockCaseService.patchCase).toHaveBeenCalledTimes(1);
      expect(mockUserActionService.creator.createUserAction).not.toHaveBeenCalled();
    });
  });

  describe('on a version conflict', () => {
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
      expect(secondWrite.updatedAttributes).toEqual(
        expect.objectContaining({
          observables: [mockObservable2, mockObservable3],
          total_observables: 2,
        })
      );
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
      expect(secondWrite.updatedAttributes).toEqual(
        expect.objectContaining({
          observables: [mockObservable2],
          total_observables: 1,
        })
      );
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

describe('observables stored as cases-observables objects', () => {
  const storedObservable = {
    id: 'type-observable-id',
    type: 'cases-observables',
    version: 'WzEsMV0=',
    references: [{ type: 'cases', id: caseSO.id, name: 'associated-cases' }],
    attributes: {
      owner: 'securitySolution',
      type_key: OBSERVABLE_TYPE_IPV4.key,
      value: '10.10.10.10',
      description: null,
      source_attachment_id: null,
      created_at: '2026-11-06T09:30:00.000Z',
      created_by: { username: 'analyst', full_name: null, email: null },
      updated_at: null,
      updated_by: null,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLicensingService.isAtLeastPlatinum.mockResolvedValue(true);
    mockClientArgs.authorization.ensureAuthorized.mockResolvedValue(undefined);
    mockCaseService.getCase.mockResolvedValue(caseSOWithObservables);
    mockCaseService.patchCase.mockResolvedValue(caseSOWithObservables);
    mockObservableService.countForCase.mockResolvedValue(1);
    mockObservableService.findExisting.mockResolvedValue([]);
    mockObservableService.getForCase.mockImplementation(async (_caseId, ids) => ({
      found: ids.includes(storedObservable.id) ? [storedObservable] : [],
      missingIds: ids.filter((id) => id !== storedObservable.id),
    }));
  });

  it('updates an observable of the type in place, with its version', async () => {
    await updateObservable(
      caseSO.id,
      storedObservable.id,
      { observable: { value: '10.10.10.11', description: 'edited' } },
      mockClientArgs,
      mockCasesClient
    );

    expect(mockObservableService.update).toHaveBeenCalledWith({
      id: storedObservable.id,
      version: storedObservable.version,
      attributes: expect.objectContaining({
        value: '10.10.10.11',
        description: 'edited',
        updated_by: mockClientArgs.user,
      }),
    });
    // The case field is not rewritten; only the total and the update time are set.
    expect(mockCaseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedAttributes: expect.objectContaining({ total_observables: 2 }),
      })
    );
    expect(mockCaseService.patchCase.mock.calls[0][0].updatedAttributes).not.toHaveProperty(
      'observables'
    );
    expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledWith({
      userAction: expect.objectContaining({
        payload: { observables: { count: 1, actionType: 'update' } },
      }),
    });
  });

  it('rejects a value edit that repeats an observable of the case field', async () => {
    await expect(
      updateObservable(
        caseSO.id,
        storedObservable.id,
        { observable: { value: mockObservable.value, description: null } },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow('Invalid duplicated observables in request.');

    expect(mockObservableService.update).not.toHaveBeenCalled();
  });

  it('rejects a field edit whose value repeats an observable of the type', async () => {
    mockObservableService.findExisting.mockResolvedValue([
      {
        id: 'other-type-observable',
        typeKey: mockObservable.typeKey,
        value: '10.20.30.40',
        description: null,
        createdAt: '2026-11-06T09:30:00.000Z',
        updatedAt: null,
      },
    ]);

    await expect(
      updateObservable(
        caseSO.id,
        mockObservable.id,
        { observable: { value: '10.20.30.40', description: null } },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow('Invalid duplicated observables in request.');

    expect(mockCaseService.patchCase).not.toHaveBeenCalled();
  });

  it('returns not found for an id in neither store', async () => {
    await expect(
      updateObservable(
        caseSO.id,
        'unknown-id',
        { observable: { value: '1.1.1.1', description: null } },
        mockClientArgs,
        mockCasesClient
      )
    ).rejects.toThrow('observable id unknown-id not found');
  });

  it('deletes an observable of the type and sets the total', async () => {
    mockObservableService.countForCase.mockResolvedValue(0);

    await deleteObservable(caseSO.id, storedObservable.id, mockClientArgs, mockCasesClient);

    expect(mockObservableService.bulkDelete).toHaveBeenCalledWith([storedObservable.id]);
    expect(mockCaseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedAttributes: expect.objectContaining({ total_observables: 1 }),
      })
    );
  });

  it('bulk deletes across both stores with one user action', async () => {
    mockObservableService.countForCase.mockResolvedValue(0);

    await bulkDeleteObservables(
      { caseId: caseSO.id, observableIds: [mockObservable.id, storedObservable.id] },
      mockClientArgs
    );

    expect(mockObservableService.bulkDelete).toHaveBeenCalledWith([storedObservable.id]);
    expect(mockCaseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({
        version: caseSOWithObservables.version,
        updatedAttributes: expect.objectContaining({ observables: [], total_observables: 0 }),
      })
    );
    expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledTimes(1);
    expect(mockUserActionService.creator.createUserAction).toHaveBeenCalledWith({
      userAction: expect.objectContaining({
        payload: { observables: { count: 2, actionType: 'delete' } },
      }),
    });
  });

  it('bulk deletes nothing when an id is in neither store', async () => {
    await expect(
      bulkDeleteObservables(
        { caseId: caseSO.id, observableIds: [storedObservable.id, 'unknown-id'] },
        mockClientArgs
      )
    ).rejects.toThrow('observable ids not found: unknown-id');

    expect(mockObservableService.bulkDelete).not.toHaveBeenCalled();
  });
});
