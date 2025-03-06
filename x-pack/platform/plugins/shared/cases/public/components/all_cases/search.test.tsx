/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { TableSearch } from './search';

// FLAKY: https://github.com/elastic/kibana/issues/206366
describe.skip('TableSearch', () => {
  const onFilterOptionsChange = jest.fn();

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders with empty value correctly', async () => {
    appMockRender.render(
      <TableSearch filterOptionsSearch="" onFilterOptionsChange={onFilterOptionsChange} />
    );

    await screen.findByDisplayValue('');
  });

  it('renders with initial value correctly', async () => {
    appMockRender.render(
      <TableSearch filterOptionsSearch="My search" onFilterOptionsChange={onFilterOptionsChange} />
    );

    await screen.findByDisplayValue('My search');
  });

  it('calls onFilterOptionsChange correctly', async () => {
    appMockRender.render(
      <TableSearch filterOptionsSearch="" onFilterOptionsChange={onFilterOptionsChange} />
    );

    await userEvent.type(await screen.findByTestId('search-cases'), 'My search{enter}');

    expect(onFilterOptionsChange).toHaveBeenCalledWith({ search: 'My search' });
  });

  it('calls onFilterOptionsChange if the search term is empty', async () => {
    appMockRender.render(
      <TableSearch filterOptionsSearch="" onFilterOptionsChange={onFilterOptionsChange} />
    );

    await userEvent.type(await screen.findByTestId('search-cases'), '      {enter}');

    expect(onFilterOptionsChange).toHaveBeenCalledWith({ search: '' });
  });

  it('calls onFilterOptionsChange when clearing the search bar', async () => {
    appMockRender.render(
      <TableSearch filterOptionsSearch="My search" onFilterOptionsChange={onFilterOptionsChange} />
    );

    await screen.findByDisplayValue('My search');

    await userEvent.click(await screen.findByTestId('clearSearchButton'));

    expect(onFilterOptionsChange).toHaveBeenCalledWith({ search: '' });
  });
});
