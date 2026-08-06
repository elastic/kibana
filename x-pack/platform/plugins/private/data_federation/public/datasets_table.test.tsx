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

  it('calls onCreate with the selected flow when a menu item is chosen', async () => {
    const onCreate = jest.fn();

    const { getByTestId } = render(
      <EuiProvider>
        <DatasetsTable
          filteredItems={[createDataSetRow({ name: 'set1', dataSource: 'ds1' })]}
          selectedItems={[]}
          dataSourceNames={['ds1']}
          dataSourceFilter={[]}
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
    fireEvent.click(getByTestId('dataSetsSetsCreateFlow2Button'));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith('flow_2');
  });

  it('renders the data source filter button', () => {
    const { getByTestId } = render(
      <EuiProvider>
        <DatasetsTable
          filteredItems={[createDataSetRow({ name: 'set1', dataSource: 'ds1' })]}
          selectedItems={[]}
          dataSourceNames={['ds1', 'ds2']}
          dataSourceFilter={['ds1']}
          onSelectionChange={jest.fn()}
          onDataSourceFilterChange={jest.fn()}
          onCreate={jest.fn()}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onDeleteSelected={jest.fn()}
        />
      </EuiProvider>
    );

    expect(getByTestId('dataSetsSetsDataSourceFilter')).toBeInTheDocument();
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
          dataSourceNames={['ds1']}
          dataSourceFilter={[]}
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
          dataSourceNames={['ds1']}
          dataSourceFilter={[]}
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
