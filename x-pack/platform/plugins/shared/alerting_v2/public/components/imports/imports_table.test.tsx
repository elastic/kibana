/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ImportListItem } from '../../hooks/use_fetch_imports';
import { ImportsTable } from './imports_table';

const mockDeleteImport = jest.fn();

jest.mock('../../hooks/use_delete_import', () => ({
  useDeleteImport: () => ({ mutate: mockDeleteImport, isLoading: false }),
}));

const ITEM: ImportListItem = {
  id: 'import-1',
  name: 'Datadog one',
  type: 'datadog',
  connectorId: 'connector/1',
};

const renderTable = (overrides: Partial<React.ComponentProps<typeof ImportsTable>> = {}) => {
  const props: React.ComponentProps<typeof ImportsTable> = {
    items: [ITEM],
    totalItemCount: 1,
    isLoading: false,
    pageIndex: 0,
    pageSize: 25,
    sortField: 'name',
    sortOrder: 'asc',
    searchText: '',
    canDelete: true,
    onSearchChange: jest.fn(),
    onTableChange: jest.fn(),
    ...overrides,
  };
  render(
    <I18nProvider>
      <ImportsTable {...props} />
    </I18nProvider>
  );
  return props;
};

describe('ImportsTable', () => {
  beforeEach(() => {
    mockDeleteImport.mockClear();
  });

  it('deletes an import after the user confirms', async () => {
    renderTable();

    fireEvent.click(screen.getByTestId('importActionsButton-import-1'));
    fireEvent.click(await screen.findByTestId('importsDeleteAction'));
    const modal = await screen.findByTestId('importsDeleteConfirmModal');
    expect(within(modal).getByText('Datadog one')).toBeInTheDocument();
    expect(mockDeleteImport).not.toHaveBeenCalled();

    fireEvent.click(within(modal).getByRole('button', { name: 'Delete' }));

    expect(mockDeleteImport).toHaveBeenCalledWith('import-1', expect.anything());
  });

  it('does not delete when the user cancels', async () => {
    renderTable();

    fireEvent.click(screen.getByTestId('importActionsButton-import-1'));
    fireEvent.click(await screen.findByTestId('importsDeleteAction'));
    const modal = await screen.findByTestId('importsDeleteConfirmModal');
    fireEvent.click(within(modal).getByRole('button', { name: 'Cancel' }));

    expect(mockDeleteImport).not.toHaveBeenCalled();
    expect(screen.queryByTestId('importsDeleteConfirmModal')).not.toBeInTheDocument();
  });

  it('hides the actions column when the user cannot delete imports', () => {
    renderTable({ canDelete: false });

    expect(screen.queryByTestId('importActionsButton-import-1')).not.toBeInTheDocument();
    expect(screen.queryByText('Actions')).not.toBeInTheDocument();
  });

  it('shows the label of the import type', () => {
    renderTable();

    expect(within(screen.getByTestId('importsTable')).getByText('Datadog')).toBeInTheDocument();
  });

  it('reports the search text as it is typed', () => {
    const { onSearchChange } = renderTable();

    fireEvent.change(screen.getByTestId('importsListSearch'), { target: { value: 'prod' } });

    expect(onSearchChange).toHaveBeenCalledWith('prod');
  });

  it('asks for the type sort when the Type header is clicked', () => {
    const { onTableChange } = renderTable();

    fireEvent.click(screen.getByRole('button', { name: /Type/ }));

    expect(onTableChange).toHaveBeenCalledWith({
      pageIndex: 0,
      pageSize: 25,
      sortField: 'type',
      sortOrder: 'asc',
    });
  });

  it('shows the no-matches message when a search finds nothing', () => {
    renderTable({ items: [], totalItemCount: 0, searchText: 'nothing' });

    expect(screen.getByText('No imports match your search.')).toBeInTheDocument();
  });
});
