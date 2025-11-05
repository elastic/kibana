/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ContextEditor } from '.';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { SEARCH } from '../../data_anonymization/settings/anonymization_settings_management/use_table';

describe('ContextEditor', () => {
  const allow = Array.from({ length: 20 }, (_, i) => `field${i + 1}`);
  const anonymizationAllFields = {
    total: 20,
    page: 1,
    perPage: 1000,
    data: allow.map((f) => ({ id: f, field: f, allowed: true, anonymized: f === 'field1' })),
  };
  const anonymizationPageFields = {
    total: 20,
    page: 1,
    perPage: 10,
    data: anonymizationAllFields.data.slice(0, 10),
  };
  const rawData = allow.reduce(
    (acc, field, index) => ({ ...acc, [field]: [`value${index + 1}`] }),
    {}
  );
  const onListUpdated = jest.fn();
  const mockSelectionActions = {
    handleSelectAll: jest.fn(),
    handleUnselectAll: jest.fn(),
    handlePageUnchecked: jest.fn(),
    handlePageChecked: jest.fn(),
    handleRowUnChecked: jest.fn(),
    handleRowChecked: jest.fn(),
    setSelectedFields: jest.fn(),
    setTotalSelectedItems: jest.fn(),
    setIsSelectAll: jest.fn(),
  };

  const renderComponent = (selectedFields: string[]) => {
    return render(
      <TestProviders>
        <ContextEditor
          anonymizationAllFields={anonymizationAllFields}
          anonymizationPageFields={anonymizationPageFields}
          onListUpdated={onListUpdated}
          rawData={rawData}
          onTableChange={jest.fn()}
          pagination={{
            pageIndex: 0,
            pageSize: 10,
            totalItemCount: anonymizationAllFields.total,
            pageSizeOptions: [10, 20],
          }}
          sorting={{
            sort: {
              field: 'field',
              direction: 'asc',
            },
          }}
          search={SEARCH}
          handleSearch={jest.fn()}
          handleTableReset={jest.fn()}
          handleRowReset={jest.fn()}
          handlePageReset={jest.fn()}
          selectionState={{
            isSelectAll: false,
            selectedFields,
            totalSelectedItems: selectedFields.length,
          }}
          selectionActions={mockSelectionActions}
        />
      </TestProviders>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the expected selected field count', () => {
    renderComponent([]);
    expect(screen.getByTestId('selectedFields')).toHaveTextContent('Selected 0 fields');
  });

  it('renders the select all fields button with the expected count', () => {
    renderComponent([]);
    expect(screen.getByTestId('selectAllFields')).toHaveTextContent('Select all 20 fields');
  });

  it('updates the table selection when page selection is checked', () => {
    renderComponent(anonymizationPageFields.data.map((field) => field.field));
    expect(screen.getByTestId('selectedFields')).toHaveTextContent('Selected 10 fields');
  });

  it('updates the table selection when select all is clicked', () => {
    renderComponent(anonymizationAllFields.data.map((field) => field.field));
    expect(screen.getByTestId('selectedFields')).toHaveTextContent('Selected 20 fields');
  });

  it('calls onListUpdated with the expected values when the update button is clicked', async () => {
    renderComponent(anonymizationPageFields.data.map((field) => field.field));
    await userEvent.click(screen.getAllByTestId('allowed')[0]);

    expect(onListUpdated).toHaveBeenCalledWith([
      {
        field: 'field1',
        operation: 'remove',
        update: 'allow',
      },
    ]);
  });
});
