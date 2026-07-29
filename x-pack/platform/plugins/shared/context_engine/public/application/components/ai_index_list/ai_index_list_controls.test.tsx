/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { AiIndexListControls } from './ai_index_list_controls';
import { AI_INDEX_OWNER_LABEL, AI_INDEX_TYPE_LABEL } from './labels';

type AiIndexListControlsProps = React.ComponentProps<typeof AiIndexListControls>;

const defaultFilters: AiIndexListControlsProps['filters'] = { query: '', types: [], owners: [] };

const renderWithProviders = (props: Partial<AiIndexListControlsProps> = {}) => {
  const setQuery = props.setQuery ?? jest.fn();
  const setTypes = props.setTypes ?? jest.fn();
  const setOwners = props.setOwners ?? jest.fn();

  render(
    <I18nProvider>
      <EuiProvider>
        <AiIndexListControls
          filters={props.filters ?? defaultFilters}
          setQuery={setQuery}
          setTypes={setTypes}
          setOwners={setOwners}
        />
      </EuiProvider>
    </I18nProvider>
  );

  return { setQuery, setTypes, setOwners };
};

describe('AiIndexListControls', () => {
  it('typing in contextAiIndexListSearch calls setQuery with the typed value', () => {
    const { setQuery } = renderWithProviders();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search AI Indexes' }), {
      target: { value: 'support tickets' },
    });

    expect(setQuery).toHaveBeenCalledWith('support tickets');
  });

  it('exposes the search field with an accessible name', () => {
    renderWithProviders();

    expect(screen.getByRole('searchbox', { name: 'Search AI Indexes' })).toBeInTheDocument();
  });

  it('renders the current filters.query value in the search input', () => {
    renderWithProviders({
      filters: { query: 'elastic managed', types: [], owners: [] },
    });

    expect(screen.getByRole('searchbox', { name: 'Search AI Indexes' })).toHaveValue(
      'elastic managed'
    );
  });

  it('renders the Type and Owner filter buttons with their labels', () => {
    renderWithProviders();

    expect(screen.getByTestId('contextAiIndexListTypeFilter')).toHaveTextContent('Type');
    expect(screen.getByTestId('contextAiIndexListOwnerFilter')).toHaveTextContent('Owner');
  });

  it('selecting a type option calls setTypes with that type', async () => {
    const { setTypes } = renderWithProviders();

    fireEvent.click(screen.getByTestId('contextAiIndexListTypeFilter'));
    fireEvent.click(await screen.findByTestId('contextAiIndexListTypeFilterOption-data_stream'));

    expect(setTypes).toHaveBeenCalledWith(['data_stream']);
  });

  it('selecting an owner option calls setOwners with that owner', async () => {
    const { setOwners } = renderWithProviders();

    fireEvent.click(screen.getByTestId('contextAiIndexListOwnerFilter'));
    fireEvent.click(await screen.findByTestId('contextAiIndexListOwnerFilterOption-managed'));

    expect(setOwners).toHaveBeenCalledWith(['managed']);
  });

  it('offers index and data_stream type options with labels from labels.ts', async () => {
    renderWithProviders();

    fireEvent.click(screen.getByTestId('contextAiIndexListTypeFilter'));

    const indexOption = await screen.findByTestId('contextAiIndexListTypeFilterOption-index');
    const dataStreamOption = await screen.findByTestId(
      'contextAiIndexListTypeFilterOption-data_stream'
    );

    expect(indexOption).toHaveTextContent(AI_INDEX_TYPE_LABEL.index);
    expect(dataStreamOption).toHaveTextContent(AI_INDEX_TYPE_LABEL.data_stream);
    expect(
      screen.queryByTestId('contextAiIndexListTypeFilterOption-managed')
    ).not.toBeInTheDocument();
  });

  it('offers managed and user owner options with labels from labels.ts', async () => {
    renderWithProviders();

    fireEvent.click(screen.getByTestId('contextAiIndexListOwnerFilter'));

    const managedOption = await screen.findByTestId('contextAiIndexListOwnerFilterOption-managed');
    const userOption = await screen.findByTestId('contextAiIndexListOwnerFilterOption-user');

    expect(managedOption).toHaveTextContent(AI_INDEX_OWNER_LABEL.managed);
    expect(userOption).toHaveTextContent(AI_INDEX_OWNER_LABEL.user);
    expect(
      screen.queryByTestId('contextAiIndexListOwnerFilterOption-index')
    ).not.toBeInTheDocument();
  });

  it('shows the Type filter as active when filters.types is non-empty', () => {
    renderWithProviders({
      filters: { query: '', types: ['index'], owners: [] },
    });

    expect(screen.getByTestId('contextAiIndexListTypeFilter')).toHaveClass(
      'euiFilterButton-hasActiveFilters'
    );
    expect(screen.getByTestId('contextAiIndexListOwnerFilter')).not.toHaveClass(
      'euiFilterButton-hasActiveFilters'
    );
  });

  it('shows the Owner filter as active when filters.owners is non-empty', () => {
    renderWithProviders({
      filters: { query: '', types: [], owners: ['user'] },
    });

    expect(screen.getByTestId('contextAiIndexListOwnerFilter')).toHaveClass(
      'euiFilterButton-hasActiveFilters'
    );
    expect(screen.getByTestId('contextAiIndexListTypeFilter')).not.toHaveClass(
      'euiFilterButton-hasActiveFilters'
    );
  });
});
