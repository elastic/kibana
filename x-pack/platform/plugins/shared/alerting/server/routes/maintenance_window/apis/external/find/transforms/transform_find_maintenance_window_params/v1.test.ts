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

  it('passing every possible field returns combined result', () => {
    const result = transformFindMaintenanceWindowParams({
      page: 1,
      per_page: 10,
      title: 'title',
      created_by: 'antonio',
      status: ['upcoming'],
    });

    expect(result).toEqual({
      page: 1,
      perPage: 10,
      status: ['upcoming'],
      search: 'title antonio',
      searchFields: ['title', 'createdBy'],
    });
  });

  it('passing array in status should return array', () => {
    const result = transformFindMaintenanceWindowParams({
      page: 1,
      per_page: 10,
      status: ['upcoming', 'finished'],
    });

    expect(result).toEqual({
      page: 1,
      perPage: 10,
      status: ['upcoming', 'finished'],
    });
  });

  it('passing string in status should return status array', () => {
    const result = transformFindMaintenanceWindowParams({
      page: 1,
      per_page: 10,
      status: 'running',
    });

    expect(result).toEqual({ page: 1, perPage: 10, status: ['running'] });
  });

  it('passing undefined in status should return object without status', () => {
    const result = transformFindMaintenanceWindowParams({
      page: 1,
      per_page: 10,
    });

    expect(result).toEqual({ page: 1, perPage: 10 });
  });

  it('passing title should return search and searchFields', () => {
    const result = transformFindMaintenanceWindowParams({
      page: 1,
      per_page: 10,
      title: 'foobar',
    });

    expect(result).toEqual({ page: 1, perPage: 10, search: 'foobar', searchFields: ['title'] });
  });

  it('passing created_by should return search and searchFields', () => {
    const result = transformFindMaintenanceWindowParams({
      page: 1,
      per_page: 10,
      created_by: 'foobar',
    });

    expect(result).toEqual({ page: 1, perPage: 10, search: 'foobar', searchFields: ['createdBy'] });
  });
});
