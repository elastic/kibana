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

const caseSO = mockCases[0];

const mockCasesClient = createCasesClientMock();
const mockClientArgs = createCasesClientMockArgs();

const mockLicensingService = mockClientArgs.services.licensingService;
const mockCaseService = mockClientArgs.services.caseService;

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
});
