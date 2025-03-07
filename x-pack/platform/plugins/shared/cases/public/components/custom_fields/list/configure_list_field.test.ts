/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configureListCustomFieldFactory } from './configure_list_field';

describe('configureListCustomFieldFactory ', () => {
  const builder = configureListCustomFieldFactory();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    expect(builder).toEqual({
      id: 'list',
      label: 'List',
      getEuiTableColumn: expect.any(Function),
      build: expect.any(Function),
      getFilterOptions: expect.any(Function),
      convertValueToDisplayText: expect.any(Function),
    });
  });
});
