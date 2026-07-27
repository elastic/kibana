/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { DataViewSelectPopoverProps } from './data_view_select_popover';
import { DataViewSelectPopover } from './data_view_select_popover';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { DataView, DataViewListItem } from '@kbn/data-views-plugin/public';
import { indexPatternEditorPluginMock as dataViewEditorPluginMock } from '@kbn/data-view-editor-plugin/public/mocks';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import type { ToastsStart } from '@kbn/core/public';

// Mock DataViewSelector to avoid expensive EuiTextTruncate rendering in jsdom
const MockedDataViewSelector = jest.fn(
  ({
    dataViewsList,
    onChangeDataView,
  }: {
    dataViewsList: Array<{ id: string; title: string }>;
    onChangeDataView: (id: string) => void;
  }) => (
    <div data-test-subj="dataViewSelector-mock">
      {dataViewsList?.map((dv) => (
        <button
          key={dv.id}
          type="button"
          data-test-subj={`dataViewOption-${dv.id}`}
          onClick={() => onChangeDataView(dv.id)}
        >
          {dv.title}
        </button>
      ))}
    </div>
  )
);
jest.mock('@kbn/unified-search-plugin/public', () => ({
  DataViewSelector: (props: {
    dataViewsList: Array<{ id: string; title: string }>;
    onChangeDataView: (id: string) => void;
  }) => MockedDataViewSelector(props),
}));

const selectedDataView = {
  id: 'mock-data-logs-id',
  namespaces: ['default'],
  title: 'kibana_sample_data_logs',
  isTimeBased: jest.fn(),
  isPersisted: jest.fn(() => true),
  getName: () => 'kibana_sample_data_logs',
} as unknown as DataView;

const dataViewListItems: DataViewListItem[] = [
  {
    id: 'mock-data-logs-id',
    namespaces: ['default'],
    title: 'kibana_sample_data_logs',
  },
  {
    id: 'mock-ecommerce-id',
    namespaces: ['default'],
    title: 'kibana_sample_data_ecommerce',
  },
  {
    id: 'mock-test-id',
    namespaces: ['default'],
    title: 'test',
  },
  {
    id: 'mock-ad-hoc-id',
    namespaces: ['default'],
    title: 'ad-hoc data view',
  },
  {
    id: 'mock-ad-hoc-esql-id',
    namespaces: ['default'],
    title: 'ad-hoc data view esql',
    type: ESQL_TYPE,
  },
];

const dataViewOptions = [
  selectedDataView,
  {
    id: 'mock-ecommerce-id',
    namespaces: ['default'],
    title: 'kibana_sample_data_ecommerce',
    typeMeta: {},
    isTimeBased: jest.fn(),
    isPersisted: jest.fn(() => true),
    getName: () => 'kibana_sample_data_ecommerce',
  },
  {
    id: 'mock-test-id',
    namespaces: ['default'],
    title: 'test',
    typeMeta: {},
    isTimeBased: jest.fn(),
    isPersisted: jest.fn(() => true),
    getName: () => 'test',
  },
  {
    id: 'mock-ad-hoc-id',
    namespaces: ['default'],
    title: 'ad-hoc data view',
    typeMeta: {},
    isTimeBased: jest.fn(),
    isPersisted: jest.fn(() => false),
    getName: () => 'ad-hoc data view',
  },
  {
    id: 'mock-ad-hoc-esql-id',
    namespaces: ['default'],
    title: 'ad-hoc data view esql',
    type: ESQL_TYPE,
    typeMeta: {},
    isTimeBased: jest.fn(),
    isPersisted: jest.fn(() => false),
    getName: () => 'ad-hoc data view esql',
  },
];

const mockAddDanger = jest.fn();

const mount = () => {
  const dataViewsMock = dataViewPluginMocks.createStartContract();
  dataViewsMock.getIdsWithTitle = jest
    .fn()
    .mockImplementation(() => Promise.resolve(dataViewListItems));
  dataViewsMock.get = jest
    .fn()
    .mockImplementation((id: string) =>
      Promise.resolve(dataViewOptions.find((current) => current.id === id))
    );
  const dataViewEditorMock = dataViewEditorPluginMock.createStartContract();
  const onSelectDataView = jest.fn();
  const toasts = { addDanger: mockAddDanger } as unknown as ToastsStart;
  const props: DataViewSelectPopoverProps = {
    dependencies: { dataViews: dataViewsMock, dataViewEditor: dataViewEditorMock, toasts },
    onSelectDataView,
    onChangeMetaData: () => {},
    dataView: selectedDataView,
  };

  return {
    result: renderWithI18n(<DataViewSelectPopover {...props} />),
    dataViewsMock,
    onSelectDataView,
  };
};

describe('DataViewSelectPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockedDataViewSelector.mockClear();
  });

  test('renders properly and loads list metadata without hydrating each data view', async () => {
    const { dataViewsMock } = mount();

    await waitFor(() => {
      expect(dataViewsMock.getIdsWithTitle).toHaveBeenCalledWith(true);
    });

    expect(screen.getByTestId('selectDataViewExpression')).toBeInTheDocument();
    expect(dataViewsMock.get).not.toHaveBeenCalled();

    const getIdsWithTitleResult = await dataViewsMock.getIdsWithTitle.mock.results[0].value;
    expect(getIdsWithTitleResult).toBe(dataViewListItems);
  });

  test('should open a popover on click and display loaded data views', async () => {
    const { dataViewsMock } = mount();

    await waitFor(() => {
      expect(dataViewsMock.getIdsWithTitle).toHaveBeenCalled();
    });

    await userEvent.click(screen.getByTestId('selectDataViewExpression'));

    await screen.findByTestId('chooseDataViewPopoverContent');

    const lastCall = MockedDataViewSelector.mock.calls.at(-1)![0];
    const dataViewTitles = lastCall.dataViewsList.map((dv: { title: string }) => dv.title);
    expect(dataViewTitles).toEqual([
      'kibana_sample_data_logs',
      'kibana_sample_data_ecommerce',
      'test',
      'ad-hoc data view',
      'ad-hoc data view esql',
    ]);
  });

  test('hydrates a data view only when one is selected', async () => {
    const { dataViewsMock, onSelectDataView } = mount();

    await waitFor(() => {
      expect(dataViewsMock.getIdsWithTitle).toHaveBeenCalled();
    });

    await userEvent.click(screen.getByTestId('selectDataViewExpression'));
    await screen.findByTestId('chooseDataViewPopoverContent');

    const { onChangeDataView } = MockedDataViewSelector.mock.calls.at(-1)![0];
    await act(async () => {
      await onChangeDataView('mock-ecommerce-id');
    });

    expect(dataViewsMock.get).toHaveBeenCalledTimes(1);
    expect(dataViewsMock.get).toHaveBeenCalledWith('mock-ecommerce-id', false);
    expect(onSelectDataView).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'mock-ecommerce-id' })
    );
  });

  test('shows a specific toast when the selected data view fails to load', async () => {
    const { dataViewsMock, onSelectDataView } = mount();
    dataViewsMock.get = jest
      .fn()
      .mockRejectedValue(new Error('index_not_found_exception: no such index'));

    await waitFor(() => {
      expect(dataViewsMock.getIdsWithTitle).toHaveBeenCalled();
    });

    await userEvent.click(screen.getByTestId('selectDataViewExpression'));
    await screen.findByTestId('chooseDataViewPopoverContent');

    const { onChangeDataView } = MockedDataViewSelector.mock.calls.at(-1)![0];
    await act(async () => {
      await onChangeDataView('mock-test-id');
    });

    expect(mockAddDanger).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Data view 'test' could not be loaded",
        text: 'index_not_found_exception: no such index',
      })
    );
    expect(onSelectDataView).not.toHaveBeenCalled();
  });
});
