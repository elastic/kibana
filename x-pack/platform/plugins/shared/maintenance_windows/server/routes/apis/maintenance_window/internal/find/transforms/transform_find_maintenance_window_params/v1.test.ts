/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformFindMaintenanceWindowParams } from './v1';

describe('transformFindMaintenanceWindowParams', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('passing string in status should return array', () => {
    const result = transformFindMaintenanceWindowParams({
      page: 1,
      per_page: 10,
      search: 'fake mw name',
      status: 'running',
    });

    expect(result).toEqual({ page: 1, perPage: 10, search: 'fake mw name', status: ['running'] });
  });

  it('passing undefined in status should return object without status', () => {
    const result = transformFindMaintenanceWindowParams({
      page: 1,
      per_page: 10,
      search: 'fake mw name',
    });

    expect(result).toEqual({ page: 1, perPage: 10, search: 'fake mw name' });
  });

  it('passing undefined in search should return object without search', () => {
    const result = transformFindMaintenanceWindowParams({
      page: 1,
      per_page: 10,
      status: ['upcoming'],
    });

    expect(result).toEqual({ page: 1, perPage: 10, status: ['upcoming'] });
  });

  it('passing array in status should return array', () => {
    const result = transformFindMaintenanceWindowParams({
      page: 1,
      per_page: 10,
      search: 'fake mw name',
      status: ['upcoming', 'finished'],
    });

    expect(result).toEqual({
      page: 1,
      perPage: 10,
      search: 'fake mw name',
      status: ['upcoming', 'finished'],
    });
  });
});
