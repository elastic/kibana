/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render } from '@testing-library/react';

import type { DataSource } from '../common';
import { DataSourcesTable } from './data_sources_table';

const createDataSource = (name: string, type: DataSource['type'] | string): DataSource =>
  ({
    name,
    // Backend can return types the UI doesn't know about yet.
    type,
    description: '',
    settings: {},
  } as unknown as DataSource);

describe('DataSourcesTable', () => {
  const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    const [first] = args;
    if (typeof first === 'string' && first.includes('Detected not recommended unit')) {
      return;
    }
  });

  afterAll(() => {
    consoleWarnSpy.mockRestore();
  });

  it('calls onCreate when the add button is clicked', async () => {
    const onCreate = jest.fn();

    const { getByTestId } = render(
      <EuiProvider>
        <DataSourcesTable
          dataSources={[createDataSource('ds1', 's3')]}
          selectedDataSources={[]}
          dataSetsCountByDataSource={new Map()}
          onSelectionChange={jest.fn()}
          onCreate={onCreate}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onDeleteSelected={jest.fn()}
        />
      </EuiProvider>
    );

    fireEvent.click(getByTestId('dataSetsCreateButton'));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('disables the edit action for a data source with an unsupported type', async () => {
    const onEdit = jest.fn();

    const { getAllByTestId } = render(
      <EuiProvider>
        <DataSourcesTable
          dataSources={[
            createDataSource('supported', 's3'),
            createDataSource('unsupported', 'http'),
          ]}
          selectedDataSources={[]}
          dataSetsCountByDataSource={new Map()}
          onSelectionChange={jest.fn()}
          onCreate={jest.fn()}
          onEdit={onEdit}
          onDelete={jest.fn()}
          onDeleteSelected={jest.fn()}
        />
      </EuiProvider>
    );

    const editButtons = getAllByTestId('dataSetsEditButton');
    expect(editButtons).toHaveLength(2);

    expect(editButtons[0]).toBeEnabled();
    expect(editButtons[1]).toBeDisabled();

    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ name: 'supported' }));
  });

  it('disables the delete action and checkbox when a data source has connected datasets', async () => {
    const onDelete = jest.fn();

    const dataSetsCountByDataSource = new Map<string, number>([
      ['Source A', 1],
      ['Source B', 0],
    ]);

    const { getAllByTestId, getByText } = render(
      <EuiProvider>
        <DataSourcesTable
          dataSources={[createDataSource('Source A', 's3'), createDataSource('Source B', 's3')]}
          selectedDataSources={[]}
          dataSetsCountByDataSource={dataSetsCountByDataSource}
          onSelectionChange={jest.fn()}
          onCreate={jest.fn()}
          onEdit={jest.fn()}
          onDelete={onDelete}
          onDeleteSelected={jest.fn()}
        />
      </EuiProvider>
    );

    const deleteButtons = getAllByTestId('dataSetsDeleteIconButton');
    expect(deleteButtons).toHaveLength(2);

    expect(deleteButtons[0]).toBeDisabled();
    expect(deleteButtons[1]).toBeEnabled();

    fireEvent.click(deleteButtons[0]);
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(deleteButtons[1]);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ name: 'Source B' }));

    const rowA = getByText('Source A').closest('tr') as HTMLElement;
    const rowB = getByText('Source B').closest('tr') as HTMLElement;

    const checkboxA = rowA.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const checkboxB = rowB.querySelector('input[type="checkbox"]') as HTMLInputElement;

    expect(checkboxA).toBeDisabled();
    expect(checkboxB).toBeEnabled();
  });

  it('shows bulk delete when selection is non-empty and calls onDeleteSelected', async () => {
    const onDeleteSelected = jest.fn();
    const selectedDataSources = [createDataSource('selected', 's3')];

    const { getByTestId } = render(
      <EuiProvider>
        <DataSourcesTable
          dataSources={[...selectedDataSources, createDataSource('other', 's3')]}
          selectedDataSources={selectedDataSources}
          dataSetsCountByDataSource={new Map()}
          onSelectionChange={jest.fn()}
          onCreate={jest.fn()}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onDeleteSelected={onDeleteSelected}
        />
      </EuiProvider>
    );

    fireEvent.click(getByTestId('dataSetsDeleteButton'));
    expect(onDeleteSelected).toHaveBeenCalledTimes(1);
    expect(onDeleteSelected).toHaveBeenCalledWith(selectedDataSources);
  });
});
