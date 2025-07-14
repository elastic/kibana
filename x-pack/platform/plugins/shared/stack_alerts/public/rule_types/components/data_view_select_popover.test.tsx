/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { DataViewSelectPopover, DataViewSelectPopoverProps } from './data_view_select_popover';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { DataView } from '@kbn/data-views-plugin/public';
import { indexPatternEditorPluginMock as dataViewEditorPluginMock } from '@kbn/data-view-editor-plugin/public/mocks';
import { DataViewSelector } from '@kbn/unified-search-plugin/public';
import { act } from 'react-dom/test-utils';
import { ESQL_TYPE } from '@kbn/data-view-utils';

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
    wrapper: mountWithIntl(<DataViewSelectPopover {...props} />),
    dataViewsMock,
  };
};

describe('DataViewSelectPopover', () => {
  test('renders properly', async () => {
    const { wrapper, dataViewsMock } = mount();

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(dataViewsMock.getIds).toHaveBeenCalled();
    expect(wrapper.find('[data-test-subj="selectDataViewExpression"]').exists()).toBeTruthy();

    const getIdsResult = await dataViewsMock.getIds.mock.results[0].value;
    expect(getIdsResult).toBe(dataViewIds);
  });

  test('should open a popover on click', async () => {
    const { wrapper } = mount();

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await wrapper.find('[data-test-subj="selectDataViewExpression"]').first().simulate('click');

    expect(wrapper.find(DataViewSelector).prop('dataViewsList')).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "mock-data-logs-id",
          "isAdhoc": false,
          "name": undefined,
          "title": "kibana_sample_data_logs",
          "type": undefined,
        },
        Object {
          "id": "mock-ecommerce-id",
          "isAdhoc": false,
          "name": undefined,
          "title": "kibana_sample_data_ecommerce",
          "type": undefined,
        },
        Object {
          "id": "mock-test-id",
          "isAdhoc": false,
          "name": undefined,
          "title": "test",
          "type": undefined,
        },
        Object {
          "id": "mock-ad-hoc-id",
          "isAdhoc": true,
          "name": undefined,
          "title": "ad-hoc data view",
          "type": undefined,
        },
        Object {
          "id": "mock-ad-hoc-esql-id",
          "isAdhoc": true,
          "name": undefined,
          "title": "ad-hoc data view esql",
          "type": "esql",
        },
      ]
    `);
  });
});
