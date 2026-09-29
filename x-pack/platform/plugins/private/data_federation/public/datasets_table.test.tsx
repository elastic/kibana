/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render } from '@testing-library/react';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DataSetWithName } from '../common';
import type { DataSetListRow } from './datasets_table';
import { DatasetsTable } from './datasets_table';

const docLinksMock = {
  links: {
    dataFederation: {
      overview: '',
      quickstart: '',
      dataSources: '',
      datasets: '',
      datasetSettings: '',
      authentication: '',
      staticCredentials: '',
      federatedIdentity: '',
      querying: '',
      security: '',
    },
  },
};

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
  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    const [first] = args;
    if (typeof first === 'string' && first.includes('Detected not recommended unit')) {
      return;
    }
  });

  afterAll(() => {
    consoleWarnSpy.mockRestore();
  });

  it('disables create when isCreateDisabled is true', async () => {
    const onCreate = vi.fn();

    const { getByTestId } = render(
      <EuiProvider>
        <KibanaContextProvider services={{ docLinks: docLinksMock }}>
          <DatasetsTable
            items={[createDataSetRow({ name: 'set1', dataSource: 'ds1' })]}
            selectedItems={[]}
            dataSourceNames={['ds1']}
            isCreateDisabled={true}
            onSelectionChange={vi.fn()}
            onCreate={onCreate}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onDeleteSelected={vi.fn()}
          />
        </KibanaContextProvider>
      </EuiProvider>
    );

    const createButton = getByTestId('dataSetsSetsCreateButton');
    expect(createButton).toBeDisabled();

    fireEvent.click(createButton);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('calls onCreate when create is enabled and clicked', async () => {
    const onCreate = vi.fn();

    const { getByTestId } = render(
      <EuiProvider>
        <KibanaContextProvider services={{ docLinks: docLinksMock }}>
          <DatasetsTable
            items={[createDataSetRow({ name: 'set1', dataSource: 'ds1' })]}
            selectedItems={[]}
            dataSourceNames={['ds1']}
            isCreateDisabled={false}
            onSelectionChange={vi.fn()}
            onCreate={onCreate}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onDeleteSelected={vi.fn()}
          />
        </KibanaContextProvider>
      </EuiProvider>
    );

    fireEvent.click(getByTestId('dataSetsSetsCreateButton'));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('filters rows by the selected data sources', async () => {
    const { getByRole, findByRole, queryByText } = render(
      <EuiProvider>
        <KibanaContextProvider services={{ docLinks: docLinksMock }}>
          <DatasetsTable
            items={[
              createDataSetRow({ name: 'set1', dataSource: 'ds1' }),
              createDataSetRow({ name: 'set2', dataSource: 'ds10' }),
              createDataSetRow({ name: 'set3', dataSource: 'ds2' }),
            ]}
            selectedItems={[]}
            dataSourceNames={['ds1', 'ds10', 'ds2']}
            isCreateDisabled={false}
            onSelectionChange={vi.fn()}
            onCreate={vi.fn()}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onDeleteSelected={vi.fn()}
          />
        </KibanaContextProvider>
      </EuiProvider>
    );

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /Data sources/ }));
    });
    const ds1Option = await findByRole('option', { name: 'ds1' });
    await act(async () => {
      fireEvent.click(ds1Option);
    });

    expect(queryByText('set1')).toBeInTheDocument();
    expect(queryByText('set2')).not.toBeInTheDocument();
    expect(queryByText('set3')).not.toBeInTheDocument();

    const ds2Option = await findByRole('option', { name: 'ds2' });
    await act(async () => {
      fireEvent.click(ds2Option);
    });

    expect(queryByText('set1')).toBeInTheDocument();
    expect(queryByText('set2')).not.toBeInTheDocument();
    expect(queryByText('set3')).toBeInTheDocument();
  });

  it('clears the selection when the data source filter changes', async () => {
    const onSelectionChange = vi.fn();
    const selectedItems = [createDataSetRow({ name: 'set1', dataSource: 'ds1' })];

    const { getByRole, findByRole } = render(
      <EuiProvider>
        <KibanaContextProvider services={{ docLinks: docLinksMock }}>
          <DatasetsTable
            items={[...selectedItems, createDataSetRow({ name: 'set2', dataSource: 'ds2' })]}
            selectedItems={selectedItems}
            dataSourceNames={['ds1', 'ds2']}
            isCreateDisabled={false}
            onSelectionChange={onSelectionChange}
            onCreate={vi.fn()}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onDeleteSelected={vi.fn()}
          />
        </KibanaContextProvider>
      </EuiProvider>
    );

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /Data sources/ }));
    });
    const option = await findByRole('option', { name: 'ds2' });
    await act(async () => {
      fireEvent.click(option);
    });

    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it('calls onEdit and onDelete for row actions', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const { getAllByTestId } = render(
      <EuiProvider>
        <KibanaContextProvider services={{ docLinks: docLinksMock }}>
          <DatasetsTable
            items={[
              createDataSetRow({ name: 'set1', dataSource: 'ds1' }),
              createDataSetRow({ name: 'set2', dataSource: 'ds1' }),
            ]}
            selectedItems={[]}
            dataSourceNames={['ds1']}
            isCreateDisabled={false}
            onSelectionChange={vi.fn()}
            onCreate={vi.fn()}
            onEdit={onEdit}
            onDelete={onDelete}
            onDeleteSelected={vi.fn()}
          />
        </KibanaContextProvider>
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
    const onDeleteSelected = vi.fn();
    const selectedItems = [createDataSetRow({ name: 'set1', dataSource: 'ds1' })];

    const { getByTestId } = render(
      <EuiProvider>
        <KibanaContextProvider services={{ docLinks: docLinksMock }}>
          <DatasetsTable
            items={[...selectedItems, createDataSetRow({ name: 'set2', dataSource: 'ds1' })]}
            selectedItems={selectedItems}
            dataSourceNames={['ds1']}
            isCreateDisabled={false}
            onSelectionChange={vi.fn()}
            onCreate={vi.fn()}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onDeleteSelected={onDeleteSelected}
          />
        </KibanaContextProvider>
      </EuiProvider>
    );

    fireEvent.click(getByTestId('dataSetsSetsDeleteButton'));
    expect(onDeleteSelected).toHaveBeenCalledTimes(1);
    expect(onDeleteSelected).toHaveBeenCalledWith(selectedItems);
  });
});
