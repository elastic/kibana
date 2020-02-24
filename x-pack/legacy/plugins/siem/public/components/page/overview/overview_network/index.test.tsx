/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';
import { mount } from 'enzyme';
import React from 'react';

import { apolloClientObservable, mockGlobalState, TestProviders } from '../../../../mock';

import { OverviewNetwork } from '.';
import { createStore, State } from '../../../../store';
import { overviewNetworkQuery } from '../../../../containers/overview/overview_network/index.gql_query';
import { GetOverviewHostQuery } from '../../../../graphql/types';
import { MockedProvider } from 'react-apollo/test-utils';
import { wait } from '../../../../lib/helpers';

jest.mock('../../../../lib/kibana');

const startDate = 1579553397080;
const endDate = 1579639797080;

interface MockedProvidedQuery {
  request: {
    query: GetOverviewHostQuery.Query;
    fetchPolicy: string;
    variables: GetOverviewHostQuery.Variables;
  };
  result: {
    data: {
      source: unknown;
    };
  };
}

const mockOpenTimelineQueryResults: MockedProvidedQuery[] = [
  {
    request: {
      query: overviewNetworkQuery,
      fetchPolicy: 'cache-and-network',
      variables: {
        sourceId: 'default',
        timerange: { interval: '12h', from: startDate, to: endDate },
        filterQuery: undefined,
        defaultIndex: [
          'apm-*-transaction*',
          'auditbeat-*',
          'endgame-*',
          'filebeat-*',
          'packetbeat-*',
          'winlogbeat-*',
        ],
        inspect: false,
      },
    },
    result: {
      data: {
        source: {
          id: 'default',
          OverviewNetwork: {
            auditbeatSocket: 1,
            filebeatCisco: 1,
            filebeatNetflow: 1,
            filebeatPanw: 1,
            filebeatSuricata: 1,
            filebeatZeek: 1,
            packetbeatDNS: 1,
            packetbeatFlow: 1,
            packetbeatTLS: 1,
          },
        },
      },
    },
  },
];

describe('OverviewNetwork', () => {
  const state: State = mockGlobalState;

  let store = createStore(state, apolloClientObservable);

  beforeEach(() => {
    const myState = cloneDeep(state);
    store = createStore(myState, apolloClientObservable);
  });

  test('it renders the expected widget title', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <OverviewNetwork endDate={endDate} setQuery={jest.fn()} startDate={startDate} />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="header-section-title"]')
        .first()
        .text()
    ).toEqual('Network events');
  });

  test('it renders an empty subtitle while loading', () => {
    const wrapper = mount(
      <TestProviders>
        <OverviewNetwork endDate={endDate} setQuery={jest.fn()} startDate={startDate} />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="header-panel-subtitle"]')
        .first()
        .text()
    ).toEqual('');
  });

  test('it renders the expected event count in the subtitle after loading events', async () => {
    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
          <OverviewNetwork endDate={endDate} setQuery={jest.fn()} startDate={startDate} />
        </MockedProvider>
      </TestProviders>
    );
    await wait();
    wrapper.update();

    expect(
      wrapper
        .find('[data-test-subj="header-panel-subtitle"]')
        .first()
        .text()
    ).toEqual('Showing: 9 events');
  });
});
