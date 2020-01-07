/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { getOr } from 'lodash/fp';
import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';

import {
  apolloClientObservable,
  mockIndexPattern,
  mockGlobalState,
  TestProviders,
} from '../../../../mock';
import { useMountAppended } from '../../../../utils/use_mount_appended';
import { createStore, hostsModel, State } from '../../../../store';
import { HostsTableType } from '../../../../store/hosts/model';
import { HostsTable } from './index';
import { mockData } from './mock';

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
  const mount = useMountAppended();

  beforeEach(() => {
    store = createStore(state, apolloClientObservable);
  });

  describe('rendering', () => {
    test('it renders the default Hosts table', () => {
      const wrapper = shallow(
        <TestProviders store={store}>
          <HostsTable
            data={mockData.Hosts.edges}
            fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.Hosts.pageInfo)}
            id="hostsQuery"
            indexPattern={mockIndexPattern}
            isInspect={false}
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', mockData.Hosts.pageInfo)}
            totalCount={mockData.Hosts.totalCount}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(toJson(wrapper.find('HostsTable'))).toMatchSnapshot();
    });

    describe('Sorting on Table', () => {
      let wrapper: ReturnType<typeof mount>;

      beforeEach(() => {
        wrapper = mount(
          <MockedProvider>
            <TestProviders store={store}>
              <HostsTable
                data={mockData.Hosts.edges}
                fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.Hosts.pageInfo)}
                id="hostsQuery"
                indexPattern={mockIndexPattern}
                isInspect={false}
                loading={false}
                loadPage={loadPage}
                showMorePagesIndicator={getOr(
                  false,
                  'showMorePagesIndicator',
                  mockData.Hosts.pageInfo
                )}
                totalCount={mockData.Hosts.totalCount}
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
