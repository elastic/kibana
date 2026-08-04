/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render } from '@testing-library/react';

import type { DataSetWithName } from '../common';
import type { DataSetListRow } from './datasets_table';
import { DatasetsTable } from './datasets_table';

const createDataSetRow = ({
  name,
  dataSource,
}: {
  name: string;
  dataSource: string;
}): DataSetListRow =>
  ({
    name,
    data_source: dataSource,
    resource: 'bucket/*',
    description: '',
  } as DataSetWithName);

describe('DatasetsTable', () => {
  const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    const [first] = args;
    if (typeof first === 'string' && first.includes('Detected not recommended unit')) {
      return;
    }
  });

  afterAll(() => {
    consoleWarnSpy.mockRestore();
  });

  it('disables create when isCreateDisabled is true', async () => {
    const onCreate = jest.fn();

    const { getByTestId } = render(
      <EuiProvider>
        <DatasetsTable
          filteredItems={[createDataSetRow({ name: 'set1', dataSource: 'ds1' })]}
          selectedItems={[]}
          dataSourceFilterOptions={[
            { value: '', text: 'All' },
            { value: 'ds1', text: 'ds1' },
          ]}
          dataSourceFilter=""
          isCreateDisabled={true}
          onSelectionChange={jest.fn()}
          onDataSourceFilterChange={jest.fn()}
          onCreate={onCreate}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onDeleteSelected={jest.fn()}
        />
      </EuiProvider>
    );

    const createButton = getByTestId('dataSetsSetsCreateButton');
    expect(createButton).toBeDisabled();

    fireEvent.click(createButton);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('calls onCreate when create is enabled and clicked', async () => {
    const onCreate = jest.fn();

    const { getByTestId } = render(
      <EuiProvider>
        <DatasetsTable
          filteredItems={[createDataSetRow({ name: 'set1', dataSource: 'ds1' })]}
          selectedItems={[]}
          dataSourceFilterOptions={[
            { value: '', text: 'All' },
            { value: 'ds1', text: 'ds1' },
          ]}
          dataSourceFilter=""
          isCreateDisabled={false}
          onSelectionChange={jest.fn()}
          onDataSourceFilterChange={jest.fn()}
          onCreate={onCreate}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onDeleteSelected={jest.fn()}
        />
      </EuiProvider>
    );

    fireEvent.click(getByTestId('dataSetsSetsCreateButton'));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('calls onDataSourceFilterChange when the filter changes', async () => {
    const onDataSourceFilterChange = jest.fn();

    const { getByTestId } = render(
      <EuiProvider>
        <DatasetsTable
          filteredItems={[createDataSetRow({ name: 'set1', dataSource: 'ds1' })]}
          selectedItems={[]}
          dataSourceFilterOptions={[
            { value: '', text: 'All' },
            { value: 'ds1', text: 'ds1' },
          ]}
          dataSourceFilter=""
          isCreateDisabled={false}
          onSelectionChange={jest.fn()}
          onDataSourceFilterChange={onDataSourceFilterChange}
          onCreate={jest.fn()}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onDeleteSelected={jest.fn()}
        />
      </EuiProvider>
    );

    fireEvent.change(getByTestId('dataSetsSetsDataSourceFilter'), { target: { value: 'ds1' } });
    expect(onDataSourceFilterChange).toHaveBeenCalledTimes(1);
    expect(onDataSourceFilterChange).toHaveBeenCalledWith('ds1');
  });

  it('calls onEdit and onDelete for row actions', async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();

    const { getAllByTestId } = render(
      <EuiProvider>
        <DatasetsTable
          filteredItems={[
            createDataSetRow({ name: 'set1', dataSource: 'ds1' }),
            createDataSetRow({ name: 'set2', dataSource: 'ds1' }),
          ]}
          selectedItems={[]}
          dataSourceFilterOptions={[
            { value: '', text: 'All' },
            { value: 'ds1', text: 'ds1' },
          ]}
          dataSourceFilter=""
          isCreateDisabled={false}
          onSelectionChange={jest.fn()}
          onDataSourceFilterChange={jest.fn()}
          onCreate={jest.fn()}
          onEdit={onEdit}
          onDelete={onDelete}
          onDeleteSelected={jest.fn()}
        />
      </EuiProvider>
    );

    const editButtons = getAllByTestId('dataSetsSetsEditButton');
    const deleteButtons = getAllByTestId('dataSetsSetsDeleteIconButton');
    expect(editButtons).toHaveLength(2);
    expect(deleteButtons).toHaveLength(2);

    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ name: 'set1' }));

    fireEvent.click(deleteButtons[1]);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ name: 'set2' }));
  });

  it('shows bulk delete when selection is non-empty and calls onDeleteSelected', async () => {
    const onDeleteSelected = jest.fn();
    const selectedItems = [createDataSetRow({ name: 'set1', dataSource: 'ds1' })];

    const { getByTestId } = render(
      <EuiProvider>
        <DatasetsTable
          filteredItems={[...selectedItems, createDataSetRow({ name: 'set2', dataSource: 'ds1' })]}
          selectedItems={selectedItems}
          dataSourceFilterOptions={[
            { value: '', text: 'All' },
            { value: 'ds1', text: 'ds1' },
          ]}
          dataSourceFilter=""
          isCreateDisabled={false}
          onSelectionChange={jest.fn()}
          onDataSourceFilterChange={jest.fn()}
          onCreate={jest.fn()}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onDeleteSelected={onDeleteSelected}
        />
      </EuiProvider>
    );

    fireEvent.click(getByTestId('dataSetsSetsDeleteButton'));
    expect(onDeleteSelected).toHaveBeenCalledTimes(1);
    expect(onDeleteSelected).toHaveBeenCalledWith(selectedItems);
  });
});
