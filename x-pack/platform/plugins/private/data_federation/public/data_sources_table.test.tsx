/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render } from '@testing-library/react';

import type { DataSource } from '../common';
import type { DataSourcesTableProps } from './data_sources_table';
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

  it('renders mock connection status for each data source', () => {
    const { getAllByTestId } = render(
      <EuiProvider>
        <DataSourcesTable
          dataSources={[createDataSource('obs-prod-s3', 's3'), createDataSource('source-b', 's3')]}
          selectedDataSources={[]}
          dataSetsCountByDataSource={new Map()}
          onSelectionChange={jest.fn()}
          onCreate={jest.fn()}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onDeleteSelected={jest.fn()}
        />
      </EuiProvider>
    );

    const statuses = getAllByTestId('dataSourceConnectionStatus');
    expect(statuses).toHaveLength(2);
    expect(statuses[0]).toHaveTextContent('Connected');
    expect(statuses[1]).toHaveTextContent('Disconnected');
  });

  it('shows a checking state and prefers checked results over the mock status', () => {
    const { getByTestId, getAllByTestId } = render(
      <EuiProvider>
        <DataSourcesTable
          dataSources={[createDataSource('obs-prod-s3', 's3'), createDataSource('source-b', 's3')]}
          selectedDataSources={[]}
          dataSetsCountByDataSource={new Map()}
          connectionStatuses={new Map([['source-b', 'connected' as const]])}
          checkingDataSourceNames={new Set(['obs-prod-s3'])}
          onSelectionChange={jest.fn()}
          onCreate={jest.fn()}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onDeleteSelected={jest.fn()}
        />
      </EuiProvider>
    );

    expect(getByTestId('dataSourceConnectionStatusChecking')).toHaveTextContent(
      'Checking connection'
    );

    // "source-b" hashes to a broken mock status, so this can only come from the checked result.
    const statuses = getAllByTestId('dataSourceConnectionStatus');
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toHaveTextContent('Connected');
  });

  it('leads the list with the data sources being checked', () => {
    const { getAllByTestId } = render(
      <EuiProvider>
        <DataSourcesTable
          dataSources={[
            createDataSource('first-by-name', 's3'),
            createDataSource('second-by-name', 's3'),
            createDataSource('just-connected', 's3'),
          ]}
          selectedDataSources={[]}
          dataSetsCountByDataSource={new Map()}
          checkingDataSourceNames={new Set(['just-connected'])}
          onSelectionChange={jest.fn()}
          onCreate={jest.fn()}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onDeleteSelected={jest.fn()}
        />
      </EuiProvider>
    );

    const names = getAllByTestId('dataSetsColName').map((cell) => cell.textContent);
    expect(names).toEqual(['just-connected', 'first-by-name', 'second-by-name']);
  });

  it('links dataset count to the datasets filter when count is greater than zero', () => {
    const onViewDataSetsForDataSource = jest.fn();
    const dataSetsCountByDataSource = new Map<string, number>([
      ['Source A', 2],
      ['Source B', 0],
    ]);

    const { getByTestId, getByText } = render(
      <EuiProvider>
        <DataSourcesTable
          dataSources={[createDataSource('Source A', 's3'), createDataSource('Source B', 's3')]}
          selectedDataSources={[]}
          dataSetsCountByDataSource={dataSetsCountByDataSource}
          onSelectionChange={jest.fn()}
          onCreate={jest.fn()}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onDeleteSelected={jest.fn()}
          onViewDataSetsForDataSource={onViewDataSetsForDataSource}
        />
      </EuiProvider>
    );

    fireEvent.click(getByTestId('dataSetsCountLink'));
    expect(onViewDataSetsForDataSource).toHaveBeenCalledTimes(1);
    expect(onViewDataSetsForDataSource).toHaveBeenCalledWith('Source A');
    expect(getByText('0')).toBeInTheDocument();
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

  it('renders an enabled toggle to the left of actions and updates it when clicked', () => {
    const Harness = () => {
      const [disabledDataSourceNames, setDisabledDataSourceNames] = useState(
        () => new Set<string>()
      );
      const onDataSourceEnabledChange: DataSourcesTableProps['onDataSourceEnabledChange'] = (
        name,
        enabled
      ) => {
        setDisabledDataSourceNames((current) => {
          const next = new Set(current);
          if (enabled) {
            next.delete(name);
          } else {
            next.add(name);
          }
          return next;
        });
      };

      return (
        <DataSourcesTable
          dataSources={[createDataSource('ds1', 's3')]}
          selectedDataSources={[]}
          dataSetsCountByDataSource={new Map()}
          onSelectionChange={jest.fn()}
          onCreate={jest.fn()}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onDeleteSelected={jest.fn()}
          disabledDataSourceNames={disabledDataSourceNames}
          onDataSourceEnabledChange={onDataSourceEnabledChange}
        />
      );
    };

    const { getByRole, getByTestId } = render(
      <EuiProvider>
        <Harness />
      </EuiProvider>
    );

    expect(getByRole('columnheader', { name: 'Enabled' })).toBeInTheDocument();

    const enabledSwitch = getByTestId('dataSetsEnabledSwitch-ds1');
    expect(enabledSwitch).toBeChecked();

    fireEvent.click(enabledSwitch);
    expect(enabledSwitch).not.toBeChecked();
    expect(enabledSwitch.closest('tr')).toHaveClass('dataFederationTableRow--disabled');

    fireEvent.click(enabledSwitch);
    expect(enabledSwitch).toBeChecked();
    expect(enabledSwitch.closest('tr')).not.toHaveClass('dataFederationTableRow--disabled');
  });
});
