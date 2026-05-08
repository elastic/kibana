/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { DataViewSelectPopoverProps } from './data_view_select_popover';
import { DataViewSelectPopover } from './data_view_select_popover';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { DataView } from '@kbn/data-views-plugin/public';
import { indexPatternEditorPluginMock as dataViewEditorPluginMock } from '@kbn/data-view-editor-plugin/public/mocks';
import { ESQL_TYPE } from '@kbn/data-view-utils';

// Mock DataViewSelector to avoid expensive EuiTextTruncate rendering in jsdom
const MockedDataViewSelector = jest.fn(({ dataViewsList }) => (
  <div data-test-subj="dataViewSelector-mock">
    {dataViewsList?.map((dv: { id: string; title: string }) => (
      <div key={dv.id} data-test-subj={`dataViewOption-${dv.id}`}>
        {dv.title}
      </div>
    ))}
  </div>
));
jest.mock('@kbn/unified-search-plugin/public', () => ({
  DataViewSelector: (props: Record<string, unknown>) => MockedDataViewSelector(props),
}));

const selectedDataView = {
  id: 'mock-data-logs-id',
  namespaces: ['default'],
  title: 'kibana_sample_data_logs',
  isTimeBased: jest.fn(),
  isPersisted: jest.fn(() => true),
  getName: () => 'kibana_sample_data_logs',
} as unknown as DataView;

const dataViewIds = [
  'mock-data-logs-id',
  'mock-ecommerce-id',
  'mock-test-id',
  'mock-ad-hoc-id',
  'mock-ad-hoc-esql-id',
];

const dataViewOptions = [
  selectedDataView,
  {
    id: 'mock-flyghts-id',
    namespaces: ['default'],
    title: 'kibana_sample_data_flights',
    isTimeBased: jest.fn(),
    isPersisted: jest.fn(() => true),
    getName: () => 'kibana_sample_data_flights',
  },
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

const mount = () => {
  const dataViewsMock = dataViewPluginMocks.createStartContract();
  dataViewsMock.getIds = jest.fn().mockImplementation(() => Promise.resolve(dataViewIds));
  dataViewsMock.get = jest
    .fn()
    .mockImplementation((id: string) =>
      Promise.resolve(dataViewOptions.find((current) => current.id === id))
    );
  const dataViewEditorMock = dataViewEditorPluginMock.createStartContract();
  const props: DataViewSelectPopoverProps = {
    dependencies: { dataViews: dataViewsMock, dataViewEditor: dataViewEditorMock },
    onSelectDataView: () => {},
    onChangeMetaData: () => {},
    dataView: selectedDataView,
  };

  return {
    result: renderWithI18n(<DataViewSelectPopover {...props} />),
    dataViewsMock,
  };
};

describe('DataViewSelectPopover', () => {
  test('renders properly', async () => {
    const { dataViewsMock } = mount();

    await waitFor(() => {
      expect(dataViewsMock.getIds).toHaveBeenCalled();
    });

    expect(screen.getByTestId('selectDataViewExpression')).toBeInTheDocument();

    const getIdsResult = await dataViewsMock.getIds.mock.results[0].value;
    expect(getIdsResult).toBe(dataViewIds);
  });

  test('should open a popover on click and display loaded data views', async () => {
    const { dataViewsMock } = mount();

    await waitFor(() => {
      expect(dataViewsMock.getIds).toHaveBeenCalled();
    });

    await userEvent.click(screen.getByTestId('selectDataViewExpression'));

    await screen.findByTestId('chooseDataViewPopoverContent');

    // Verify the DataViewSelector received the correct filtered data views
    // (excludes flights which isn't in dataViewIds)
    const lastCall = MockedDataViewSelector.mock.calls.at(-1)![0];
    const dataViewTitles = lastCall.dataViewsList.map((dv: { title: string }) => dv.title);
    expect(dataViewTitles).toEqual([
      'kibana_sample_data_logs',
      'kibana_sample_data_ecommerce',
      'test',
      'ad-hoc data view',
      'ad-hoc data view esql',
    ]);
    expect(dataViewTitles).not.toContain('kibana_sample_data_flights');
  });
});
