/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';

import { TemplatesSearch } from './templates_search';
import { renderWithTestingProviders } from '../../../common/mock';

describe('TemplatesSearch', () => {
  const onSearchChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with empty value correctly', async () => {
    renderWithTestingProviders(<TemplatesSearch search="" onSearchChange={onSearchChange} />);

    expect(await screen.findByTestId('templates-search')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('')).toBeInTheDocument();
  });

  it('displays placeholder text indicating searchable fields', async () => {
    renderWithTestingProviders(<TemplatesSearch search="" onSearchChange={onSearchChange} />);

    expect(
      await screen.findByPlaceholderText('Search by name, description, or field name')
    ).toBeInTheDocument();
  });

  it('renders with initial value correctly', async () => {
    renderWithTestingProviders(
      <TemplatesSearch search="My search" onSearchChange={onSearchChange} />
    );

    expect(await screen.findByDisplayValue('My search')).toBeInTheDocument();
  });

  it('calls onSearchChange correctly when pressing enter', async () => {
    renderWithTestingProviders(<TemplatesSearch search="" onSearchChange={onSearchChange} />);

    await userEvent.type(await screen.findByTestId('templates-search'), 'My search{enter}');

    expect(onSearchChange).toHaveBeenCalledWith('My search');
  });

  it('trims whitespace from search term', async () => {
    renderWithTestingProviders(<TemplatesSearch search="" onSearchChange={onSearchChange} />);

    await userEvent.type(await screen.findByTestId('templates-search'), '  My search  {enter}');

    expect(onSearchChange).toHaveBeenCalledWith('My search');
  });

  it('calls onSearchChange with empty string when search is only whitespace', async () => {
    renderWithTestingProviders(<TemplatesSearch search="" onSearchChange={onSearchChange} />);

    await userEvent.type(await screen.findByTestId('templates-search'), '      {enter}');

    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('calls onSearchChange when clearing the search bar', async () => {
    renderWithTestingProviders(
      <TemplatesSearch search="My search" onSearchChange={onSearchChange} />
    );

    await screen.findByDisplayValue('My search');

    await userEvent.click(await screen.findByTestId('clearSearchButton'));

    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('does not call onSearchChange on typing without pressing enter', async () => {
    renderWithTestingProviders(<TemplatesSearch search="" onSearchChange={onSearchChange} />);

    await userEvent.type(await screen.findByTestId('templates-search'), 'My search');

    expect(onSearchChange).not.toHaveBeenCalled();
  });
});
