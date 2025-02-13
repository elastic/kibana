/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configureNumberCustomFieldFactory } from './configure_number_field';

describe('configureTextCustomFieldFactory ', () => {
  const builder = configureNumberCustomFieldFactory();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    expect(builder).toEqual({
      id: 'number',
      label: 'Number',
      getEuiTableColumn: expect.any(Function),
      build: expect.any(Function),
    });
  });
});
