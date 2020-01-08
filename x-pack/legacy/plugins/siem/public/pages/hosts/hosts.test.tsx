/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React from 'react';
import { Router } from 'react-router-dom';
import { MockedProvider } from 'react-apollo/test-utils';
import { ActionCreator } from 'typescript-fsa';

import { esFilters } from '../../../../../../../src/plugins/data/common/es_query';
import '../../mock/match_media';
import { mocksSource } from '../../containers/source/mock';
import { wait } from '../../lib/helpers';
import { apolloClientObservable, TestProviders, mockGlobalState } from '../../mock';
import { InputsModelId } from '../../store/inputs/constants';
import { SiemNavigation } from '../../components/navigation';
import { inputsActions } from '../../store/inputs';
import { State, createStore } from '../../store';
import { HostsComponentProps } from './types';
import { Hosts } from './hosts';
import { HostsTabs } from './hosts_tabs';

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
jest.mock('../../components/search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../../components/query_bar', () => ({
  QueryBar: () => null,
}));

let localSource: Array<{
  request: {};
  result: {
    data: {
      source: {
        status: {
          indicesExist: boolean;
        };
      };
    };
  };
}>;

type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';
const location = {
  pathname: '/network',
  search: '',
  state: '',
  hash: '',
};
const mockHistory = {
  length: 2,
  location,
  action: pop,
  push: jest.fn(),
  replace: jest.fn(),
  go: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  block: jest.fn(),
  createHref: jest.fn(),
  listen: jest.fn(),
};

const to = new Date('2018-03-23T18:49:23.132Z').valueOf();
const from = new Date('2018-03-24T03:33:52.253Z').valueOf();

describe('Hosts - rendering', () => {
  const hostProps: HostsComponentProps = {
    from,
    to,
    setQuery: jest.fn(),
    isInitializing: false,
    setAbsoluteRangeDatePicker: (jest.fn() as unknown) as ActionCreator<{
      from: number;
      id: InputsModelId;
      to: number;
    }>,
    query: { query: '', language: 'kuery' },
    filters: [],
    hostsPagePath: '',
  };

  beforeEach(() => {
    localSource = cloneDeep(mocksSource);
  });

  test('it renders the Setup Instructions text when no index is available', async () => {
    localSource[0].result.data.source.status.indicesExist = false;
    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={localSource} addTypename={false}>
          <Router history={mockHistory}>
            <Hosts {...hostProps} />
          </Router>
        </MockedProvider>
      </TestProviders>
    );
    // Why => https://github.com/apollographql/react-apollo/issues/1711
    await new Promise(resolve => setTimeout(resolve));
    wrapper.update();
    expect(wrapper.find('[data-test-subj="empty-page"]').exists()).toBe(true);
  });

  test('it DOES NOT render the Setup Instructions text when an index is available', async () => {
    localSource[0].result.data.source.status.indicesExist = true;
    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={localSource} addTypename={false}>
          <Router history={mockHistory}>
            <Hosts {...hostProps} />
          </Router>
        </MockedProvider>
      </TestProviders>
    );
    // Why => https://github.com/apollographql/react-apollo/issues/1711
    await new Promise(resolve => setTimeout(resolve));
    wrapper.update();
    expect(wrapper.find('[data-test-subj="empty-page"]').exists()).toBe(false);
  });

  test('it should render tab navigation', async () => {
    localSource[0].result.data.source.status.indicesExist = true;
    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={localSource} addTypename={false}>
          <Router history={mockHistory}>
            <Hosts {...hostProps} />
          </Router>
        </MockedProvider>
      </TestProviders>
    );
    await wait();
    wrapper.update();
    expect(wrapper.find(SiemNavigation).exists()).toBe(true);
  });

  test('it should add the new filters after init', async () => {
    const newFilters: esFilters.Filter[] = [
      {
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    {
                      match_phrase: {
                        'host.name': 'ItRocks',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        meta: {
          alias: '',
          disabled: false,
          key: 'bool',
          negate: false,
          type: 'custom',
          value:
            '{"query": {"bool": {"filter": [{"bool": {"should": [{"match_phrase": {"host.name": "ItRocks"}}],"minimum_should_match": 1}}]}}}',
        },
      },
    ];
    localSource[0].result.data.source.status.indicesExist = true;
    const myState: State = mockGlobalState;
    const myStore = createStore(myState, apolloClientObservable);
    const wrapper = mount(
      <TestProviders store={myStore}>
        <MockedProvider mocks={localSource} addTypename={false}>
          <Router history={mockHistory}>
            <Hosts {...hostProps} />
          </Router>
        </MockedProvider>
      </TestProviders>
    );
    await wait();
    wrapper.update();

    myStore.dispatch(inputsActions.setSearchBarFilter({ id: 'global', filters: newFilters }));
    wrapper.update();
    expect(wrapper.find(HostsTabs).props().filterQuery).toEqual(
      '{"bool":{"must":[],"filter":[{"match_all":{}},{"bool":{"filter":[{"bool":{"should":[{"match_phrase":{"host.name":"ItRocks"}}],"minimum_should_match":1}}]}}],"should":[],"must_not":[]}}'
    );
  });
});
