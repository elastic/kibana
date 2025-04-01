/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Configurations } from '../../common/types/domain/configure/v1';
import { OBSERVABLE_TYPES_BUILTIN } from '../../common/constants';
import { createCasesClientMock } from './mocks';
import { getAvailableObservableTypesMap } from './observable_types';
import type { ObservableType } from '../../common/types/domain';

const mockCasesClient = createCasesClientMock();

const arrayToMap = (arr: ObservableType[]): Map<string, ObservableType> => {
  return new Map(arr.map((item) => [item.key, item]));
};

describe('getAvailableObservableTypesMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a map of available observable types', async () => {
    const mockObservableTypes = [
      { key: 'type1', label: 'test 1' },
      { key: 'type2', label: 'test 2' },
    ];

    jest.mocked(mockCasesClient.configure.get).mockResolvedValue([
      {
        observableTypes: mockObservableTypes,
      },
    ] as unknown as Configurations);

    const result = await getAvailableObservableTypesMap(mockCasesClient, 'mock-owner');

    expect(result).toEqual(arrayToMap([...OBSERVABLE_TYPES_BUILTIN, ...mockObservableTypes]));
  });

  it('should return only built-in observable types if no types are configured', async () => {
    jest.mocked(mockCasesClient.configure.get).mockResolvedValue([
      {
        observableTypes: [],
      },
    ] as unknown as Configurations);

    const result = await getAvailableObservableTypesMap(mockCasesClient, 'mock-owner');

    expect(result).toEqual(arrayToMap(OBSERVABLE_TYPES_BUILTIN));
  });

  it('should handle errors and return an empty map', async () => {
    jest
      .mocked(mockCasesClient.configure.get)
      .mockRejectedValue(new Error('Failed to fetch configuration'));

    const result = await getAvailableObservableTypesMap(mockCasesClient, 'mock-owner');

    expect(result).toEqual(new Map());
  });
});
