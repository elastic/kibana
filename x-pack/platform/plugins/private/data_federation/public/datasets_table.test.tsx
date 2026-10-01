/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render } from '@testing-library/react';
import { createMemoryHistory } from 'history';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Router } from '@kbn/shared-ux-router';
import type { DataSetWithName } from '../common';
import { CREATE_DATASET_PATH, getEditDatasetPath } from './app_paths';
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

interface DiscoverLocatorMock {
  navigateSync: jest.Mock;
}

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

  const renderTable = (
    props: Partial<React.ComponentProps<typeof DatasetsTable>> = {},
    discoverLocator?: DiscoverLocatorMock
  ) => {
    const history = createMemoryHistory({ initialEntries: ['/datasets'] });
    const view = render(
      <EuiProvider>
        <Router history={history}>
          <KibanaContextProvider services={{ docLinks: docLinksMock, discoverLocator }}>
            <DatasetsTable
              items={[createDataSetRow({ name: 'set1', dataSource: 'ds1' })]}
              selectedItems={[]}
              dataSourceNames={['ds1']}
              onSelectionChange={jest.fn()}
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

  it('links the add dataset button to the create wizard', async () => {
    const { getByTestId, history } = renderTable();

    fireEvent.click(getByTestId('dataSetsSetsCreateButton'));
    expect(history.location.pathname).toBe(CREATE_DATASET_PATH);
  });

  it('keeps the add dataset button enabled when there are no data sources', async () => {
    const { getByTestId, history } = renderTable({ items: [], dataSourceNames: [] });

    const createButton = getByTestId('dataSetsSetsCreateButton');
    expect(createButton).toBeEnabled();

    fireEvent.click(createButton);
    expect(history.location.pathname).toBe(CREATE_DATASET_PATH);
  });

  it('filters rows by the selected data sources', async () => {
    const { getByRole, findByRole, queryByText } = renderTable({
      items: [
        createDataSetRow({ name: 'set1', dataSource: 'ds1' }),
        createDataSetRow({ name: 'set2', dataSource: 'ds10' }),
        createDataSetRow({ name: 'set3', dataSource: 'ds2' }),
      ],
      dataSourceNames: ['ds1', 'ds10', 'ds2'],
    });

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
    const onSelectionChange = jest.fn();
    const selectedItems = [createDataSetRow({ name: 'set1', dataSource: 'ds1' })];

    const { getByRole, findByRole } = renderTable({
      items: [...selectedItems, createDataSetRow({ name: 'set2', dataSource: 'ds2' })],
      selectedItems,
      dataSourceNames: ['ds1', 'ds2'],
      onSelectionChange,
    });

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /Data sources/ }));
    });
    const option = await findByRole('option', { name: 'ds2' });
    await act(async () => {
      fireEvent.click(option);
    });

    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  const twoRows = [
    createDataSetRow({ name: 'set1', dataSource: 'ds1' }),
    createDataSetRow({ name: 'set2', dataSource: 'ds1' }),
  ];

  it('navigates to the edit wizard from the row actions menu', async () => {
    const { getAllByTestId, getByTestId, history } = renderTable({ items: twoRows });

    fireEvent.click(getAllByTestId('dataSetsSetsActionsButton')[0]);
    fireEvent.click(getByTestId('dataSetsSetsEditButton'));
    expect(history.location.pathname).toBe(getEditDatasetPath('set1'));
  });

  it('calls onDelete from the row actions menu', async () => {
    const onDelete = jest.fn();
    const { getAllByTestId, getByTestId } = renderTable({ items: twoRows, onDelete });

    fireEvent.click(getAllByTestId('dataSetsSetsActionsButton')[1]);
    fireEvent.click(getByTestId('dataSetsSetsDeleteIconButton'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ name: 'set2' }));
  });

  it('opens Discover with an ES|QL query for the dataset', async () => {
    const navigateSync = jest.fn();
    const { getByTestId } = renderTable({}, { navigateSync });

    fireEvent.click(getByTestId('dataSetsSetsDiscoverButton'));
    expect(navigateSync).toHaveBeenCalledTimes(1);
    expect(navigateSync).toHaveBeenCalledWith({ query: { esql: 'FROM "set1"' } });
  });

  it('disables the row actions while rows are selected', async () => {
    const navigateSync = jest.fn();
    const selectedItems = [createDataSetRow({ name: 'set1', dataSource: 'ds1' })];
    const { getByTestId } = renderTable({ items: selectedItems, selectedItems }, { navigateSync });

    expect(getByTestId('dataSetsSetsActionsButton')).toBeDisabled();
    const discoverButton = getByTestId('dataSetsSetsDiscoverButton');
    expect(discoverButton).toBeDisabled();
    fireEvent.click(discoverButton);
    expect(navigateSync).not.toHaveBeenCalled();
  });

  it('hides the Discover link when Discover is unavailable', async () => {
    const { queryByTestId } = renderTable();

    expect(queryByTestId('dataSetsSetsDiscoverButton')).not.toBeInTheDocument();
  });

  it('shows bulk delete when selection is non-empty and calls onDeleteSelected', async () => {
    const onDeleteSelected = jest.fn();
    const selectedItems = [createDataSetRow({ name: 'set1', dataSource: 'ds1' })];
    const { getByTestId } = renderTable({
      items: [...selectedItems, createDataSetRow({ name: 'set2', dataSource: 'ds1' })],
      selectedItems,
      onDeleteSelected,
    });

    fireEvent.click(getByTestId('dataSetsSetsDeleteButton'));
    expect(onDeleteSelected).toHaveBeenCalledTimes(1);
    expect(onDeleteSelected).toHaveBeenCalledWith(selectedItems);
  });
});
