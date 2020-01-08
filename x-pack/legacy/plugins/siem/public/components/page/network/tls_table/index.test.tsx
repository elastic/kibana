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
import { Provider as ReduxStoreProvider } from 'react-redux';

import { apolloClientObservable, mockGlobalState, TestProviders } from '../../../../mock';
import { useMountAppended } from '../../../../utils/use_mount_appended';
import { createStore, networkModel, State } from '../../../../store';

import { TlsTable } from '.';
import { mockTlsData } from './mock';

describe('Tls Table Component', () => {
  const loadPage = jest.fn();
  const state: State = mockGlobalState;

  let store = createStore(state, apolloClientObservable);
  const mount = useMountAppended();

  beforeEach(() => {
    store = createStore(state, apolloClientObservable);
  });

  describe('Rendering', () => {
    test('it renders the default Domains table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <TlsTable
            data={mockTlsData.edges}
            fakeTotalCount={getOr(50, 'fakeTotalCount', mockTlsData.pageInfo)}
            id="tls"
            isInspect={false}
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', mockTlsData.pageInfo)}
            totalCount={1}
            type={networkModel.NetworkType.details}
          />
        </ReduxStoreProvider>
      );

      expect(toJson(wrapper.find('Connect(TlsTableComponent)'))).toMatchSnapshot();
    });
  });

  describe('Sorting on Table', () => {
    test('when you click on the column header, you should show the sorting icon', () => {
      const wrapper = mount(
        <MockedProvider>
          <TestProviders store={store}>
            <TlsTable
              data={mockTlsData.edges}
              fakeTotalCount={getOr(50, 'fakeTotalCount', mockTlsData.pageInfo)}
              id="tls"
              isInspect={false}
              loading={false}
              loadPage={loadPage}
              showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', mockTlsData.pageInfo)}
              totalCount={1}
              type={networkModel.NetworkType.details}
            />
          </TestProviders>
        </MockedProvider>
      );
      expect(store.getState().network.details.queries!.tls.sort).toEqual({
        direction: 'desc',
        field: '_id',
      });

      wrapper
        .find('.euiTable thead tr th button')
        .first()
        .simulate('click');

      wrapper.update();

      expect(store.getState().network.details.queries!.tls.sort).toEqual({
        direction: 'asc',
        field: '_id',
      });

      expect(
        wrapper
          .find('.euiTable thead tr th button')
          .first()
          .text()
      ).toEqual('SHA1 fingerprintClick to sort in descending order');
    });
  });
});
