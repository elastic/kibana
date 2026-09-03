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
  applyObservablesToCase,
} from './observables';
import Boom from '@hapi/boom';
import { LICENSING_CASE_OBSERVABLES_FEATURE } from '../../common/constants';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { mockCases } from '../../mocks';
import {
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_IPV6,
  MAX_OBSERVABLES_PER_CASE,
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
const caseSOWithObservables = {
  ...caseSO,
  attributes: {
    ...caseSO.attributes,
    observables: [mockObservable],
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
    expect(result?.newlyAddedObservables).toHaveLength(1);
    expect(result?.newlyAddedObservables[0].value).toBe(newObservable.value);
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

    expect(result?.newlyAddedObservables).toHaveLength(1);
    expect(result?.newlyAddedObservables[0].value).toBe(newObservable.value);
  });

  it('returns undefined when all observables are duplicates', async () => {
    mockCaseService.getCase.mockResolvedValue({
      ...caseSO,
      attributes: { ...caseSO.attributes, observables: [mockObservable] },
    });

    // All duplicates — applyObservablesToCase returns early before the patch
    const result = await applyObservablesToCase(caseSO.id, [mockObservablePost], mockClientArgs);

    expect(result).toBeUndefined();
    expect(mockCaseService.patchCase).not.toHaveBeenCalled();
  });

  it('returns undefined when the input is empty', async () => {
    const result = await applyObservablesToCase(caseSO.id, [], mockClientArgs);

    expect(result).toBeUndefined();
  });

  it('does not add any observable when the case is already at the cap', async () => {
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

    expect(result).toBeUndefined();
    expect(mockCaseService.patchCase).not.toHaveBeenCalled();
    expect(mockUserActionService.creator.createUserAction).not.toHaveBeenCalled();
  });
});
