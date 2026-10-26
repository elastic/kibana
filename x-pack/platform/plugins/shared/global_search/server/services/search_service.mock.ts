/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchServiceSetup, SearchServiceStart } from './search_service';
import { of } from 'rxjs';

const createSetupMock = () => {
  const mock: jest.Mocked<SearchServiceSetup> = {
    registerResultProvider: jest.fn(),
  };

  return mock;
};

const createStartMock = () => {
  const mock: jest.Mocked<SearchServiceStart> = {
    find: jest.fn(),
    getSearchableTypes: jest.fn(),
  };
  mock.find.mockReturnValue(of({ results: [] }));
  mock.getSearchableTypes.mockResolvedValue([]);

  return mock;
};

export const searchServiceMock = {
  createSetupContract: createSetupMock,
  createStartContract: createStartMock,
};
