/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { getOr } from 'lodash/fp';
import * as React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';

import {
  apolloClientObservable,
  mockIndexPattern,
  mockGlobalState,
  TestProviders,
} from '../../../../mock';
import { mockUiSettings } from '../../../../mock/ui_settings';
import { useKibanaCore } from '../../../../lib/compose/kibana_core';
import { createStore, hostsModel, State } from '../../../../store';
import { HostsTableType } from '../../../../store/hosts/model';
import { HostsTable } from './index';
import { mockData } from './mock';

const mockUseKibanaCore = useKibanaCore as jest.Mock;
jest.mock('../../../../lib/compose/kibana_core');
mockUseKibanaCore.mockImplementation(() => ({
  uiSettings: mockUiSettings,
}));

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
jest.mock('../../../search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../../../query_bar', () => ({
  QueryBar: () => null,
}));

describe('Hosts Table', () => {
  const loadPage = jest.fn();
  const state: State = mockGlobalState;

  let store = createStore(state, apolloClientObservable);

  beforeEach(() => {
    store = createStore(state, apolloClientObservable);
  });

  describe('rendering', () => {
    test('it renders the default Hosts table', () => {
      const wrapper = shallow(
        <TestProviders store={store}>
          <HostsTable
            data={mockData.Hosts.edges}
            id="hostsQuery"
            isInspect={false}
            indexPattern={mockIndexPattern}
            fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.Hosts.pageInfo)}
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', mockData.Hosts.pageInfo)}
            totalCount={mockData.Hosts.totalCount}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    describe('Sorting on Table', () => {
      let wrapper = mount(
        <MockedProvider>
          <TestProviders store={store}>
            <HostsTable
              id="hostsQuery"
              isInspect={false}
              indexPattern={mockIndexPattern}
              loading={false}
              data={mockData.Hosts.edges}
              totalCount={mockData.Hosts.totalCount}
              fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.Hosts.pageInfo)}
              showMorePagesIndicator={getOr(
                false,
                'showMorePagesIndicator',
                mockData.Hosts.pageInfo
              )}
              loadPage={loadPage}
              type={hostsModel.HostsType.page}
            />
          </TestProviders>
        </MockedProvider>
      );

      beforeEach(() => {
        wrapper = mount(
          <MockedProvider>
            <TestProviders store={store}>
              <HostsTable
                id="hostsQuery"
                indexPattern={mockIndexPattern}
                isInspect={false}
                loading={false}
                data={mockData.Hosts.edges}
                totalCount={mockData.Hosts.totalCount}
                fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.Hosts.pageInfo)}
                showMorePagesIndicator={getOr(
                  false,
                  'showMorePagesIndicator',
                  mockData.Hosts.pageInfo
                )}
                loadPage={loadPage}
                type={hostsModel.HostsType.page}
              />
            </TestProviders>
          </MockedProvider>
        );
      });
      test('Initial value of the store', () => {
        expect(store.getState().hosts.page.queries[HostsTableType.hosts]).toEqual({
          activePage: 0,
          direction: 'desc',
          sortField: 'lastSeen',
          limit: 10,
        });
        expect(
          wrapper
            .find('.euiTable thead tr th button')
            .at(1)
            .text()
        ).toEqual('Last seen Click to sort in ascending order');
        expect(
          wrapper
            .find('.euiTable thead tr th button')
            .at(1)
            .find('svg')
        ).toBeTruthy();
      });

      test('when you click on the column header, you should show the sorting icon', () => {
        wrapper
          .find('.euiTable thead tr th button')
          .first()
          .simulate('click');

        wrapper.update();

        expect(store.getState().hosts.page.queries[HostsTableType.hosts]).toEqual({
          activePage: 0,
          direction: 'asc',
          sortField: 'hostName',
          limit: 10,
        });
        expect(
          wrapper
            .find('.euiTable thead tr th button')
            .first()
            .text()
        ).toEqual('Host nameClick to sort in descending order');
      });
    });
  });
});
