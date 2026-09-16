/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render } from '@testing-library/react';
import { createMemoryHistory } from 'history';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Router } from '@kbn/shared-ux-router';
import type { DataSetWithName } from '../common';
import { CREATE_DATASET_PATH } from './app_paths';
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
  const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    const [first] = args;
    if (typeof first === 'string' && first.includes('Detected not recommended unit')) {
      return;
    }
  });

  afterAll(() => {
    consoleWarnSpy.mockRestore();
  });

  const renderTable = (props: Partial<React.ComponentProps<typeof DatasetsTable>> = {}) => {
    const history = createMemoryHistory({ initialEntries: ['/datasets'] });
    const view = render(
      <EuiProvider>
        <Router history={history}>
          <KibanaContextProvider services={{ docLinks: docLinksMock }}>
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
              onEdit={jest.fn()}
              onDelete={jest.fn()}
              onDeleteSelected={jest.fn()}
              {...props}
            />
          </KibanaContextProvider>
        </Router>
      </EuiProvider>
    );
    return { ...view, history };
  };

  it('disables create when isCreateDisabled is true', async () => {
    const { getByTestId, history } = renderTable({ isCreateDisabled: true });

    const createButton = getByTestId('dataSetsSetsCreateButton');
    expect(createButton).toBeDisabled();

    fireEvent.click(createButton);
    expect(history.location.pathname).toBe('/datasets');
  });

  it('links the add dataset button to the create wizard', async () => {
    const { getByTestId, history } = renderTable();

    fireEvent.click(getByTestId('dataSetsSetsCreateButton'));
    expect(history.location.pathname).toBe(CREATE_DATASET_PATH);
  });

  it('calls onDataSourceFilterChange when the filter changes', async () => {
    const onDataSourceFilterChange = jest.fn();
    const { getByTestId } = renderTable({ onDataSourceFilterChange });

    fireEvent.change(getByTestId('dataSetsSetsDataSourceFilter'), { target: { value: 'ds1' } });
    expect(onDataSourceFilterChange).toHaveBeenCalledTimes(1);
    expect(onDataSourceFilterChange).toHaveBeenCalledWith('ds1');
  });

  it('calls onEdit and onDelete for row actions', async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const { getAllByTestId } = renderTable({
      filteredItems: [
        createDataSetRow({ name: 'set1', dataSource: 'ds1' }),
        createDataSetRow({ name: 'set2', dataSource: 'ds1' }),
      ],
      onEdit,
      onDelete,
    });

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
    const { getByTestId } = renderTable({
      filteredItems: [...selectedItems, createDataSetRow({ name: 'set2', dataSource: 'ds1' })],
      selectedItems,
      onDeleteSelected,
    });

    fireEvent.click(getByTestId('dataSetsSetsDeleteButton'));
    expect(onDeleteSelected).toHaveBeenCalledTimes(1);
    expect(onDeleteSelected).toHaveBeenCalledWith(selectedItems);
  });
});
