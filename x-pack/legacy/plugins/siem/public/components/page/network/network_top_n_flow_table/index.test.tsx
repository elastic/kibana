/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { getOr } from 'lodash/fp';
import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import { Provider as ReduxStoreProvider } from 'react-redux';

import { FlowTargetSourceDest } from '../../../../graphql/types';
import { apolloClientObservable, mockGlobalState, TestProviders } from '../../../../mock';
import { useMountAppended } from '../../../../utils/use_mount_appended';
import { createStore, networkModel, State } from '../../../../store';

import { NetworkTopNFlowTable } from '.';
import { mockData } from './mock';

describe('NetworkTopNFlow Table Component', () => {
  const loadPage = jest.fn();
  const state: State = mockGlobalState;

  let store = createStore(state, apolloClientObservable);
  const mount = useMountAppended();

  beforeEach(() => {
    store = createStore(state, apolloClientObservable);
  });

  describe('rendering', () => {
    test('it renders the default NetworkTopNFlow table on the Network page', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <NetworkTopNFlowTable
            data={mockData.NetworkTopNFlow.edges}
            fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.NetworkTopNFlow.pageInfo)}
            flowTargeted={FlowTargetSourceDest.source}
            id="topNFlowSource"
            isInspect={false}
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={getOr(
              false,
              'showMorePagesIndicator',
              mockData.NetworkTopNFlow.pageInfo
            )}
            totalCount={mockData.NetworkTopNFlow.totalCount}
            type={networkModel.NetworkType.page}
          />
        </ReduxStoreProvider>
      );

      expect(wrapper.find('Connect(Component)')).toMatchSnapshot();
    });

    test('it renders the default NetworkTopNFlow table on the IP Details page', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <NetworkTopNFlowTable
            data={mockData.NetworkTopNFlow.edges}
            fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.NetworkTopNFlow.pageInfo)}
            flowTargeted={FlowTargetSourceDest.source}
            id="topNFlowSource"
            isInspect={false}
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={getOr(
              false,
              'showMorePagesIndicator',
              mockData.NetworkTopNFlow.pageInfo
            )}
            totalCount={mockData.NetworkTopNFlow.totalCount}
            type={networkModel.NetworkType.details}
          />
        </ReduxStoreProvider>
      );

      expect(wrapper.find('Connect(Component)')).toMatchSnapshot();
    });
  });

  describe('Sorting on Table', () => {
    test('when you click on the column header, you should show the sorting icon', () => {
      const wrapper = mount(
        <MockedProvider>
          <TestProviders store={store}>
            <NetworkTopNFlowTable
              data={mockData.NetworkTopNFlow.edges}
              fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.NetworkTopNFlow.pageInfo)}
              flowTargeted={FlowTargetSourceDest.source}
              id="topNFlowSource"
              isInspect={false}
              loading={false}
              loadPage={loadPage}
              showMorePagesIndicator={getOr(
                false,
                'showMorePagesIndicator',
                mockData.NetworkTopNFlow.pageInfo
              )}
              totalCount={mockData.NetworkTopNFlow.totalCount}
              type={networkModel.NetworkType.page}
            />
          </TestProviders>
        </MockedProvider>
      );
      expect(store.getState().network.page.queries.topNFlowSource.sort).toEqual({
        direction: 'desc',
        field: 'bytes_out',
      });

      wrapper
        .find('.euiTable thead tr th button')
        .at(1)
        .simulate('click');

      wrapper.update();

      expect(store.getState().network.page.queries.topNFlowSource.sort).toEqual({
        direction: 'asc',
        field: 'bytes_out',
      });
      expect(
        wrapper
          .find('.euiTable thead tr th button')
          .first()
          .text()
      ).toEqual('Bytes inClick to sort in ascending order');
      expect(
        wrapper
          .find('.euiTable thead tr th button')
          .at(1)
          .text()
      ).toEqual('Bytes outClick to sort in descending order');
      expect(
        wrapper
          .find('.euiTable thead tr th button')
          .at(1)
          .find('svg')
      ).toBeTruthy();
    });
  });
});
