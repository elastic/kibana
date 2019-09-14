/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';
import { Router } from 'react-router-dom';
import { ActionCreator } from 'typescript-fsa';

import '../../mock/match_media';
import '../../mock/ui_settings';
import { Hosts, HostsComponentProps } from './hosts';

import { mocksSource } from '../../containers/source/mock';
import { TestProviders } from '../../mock';
import { MockedProvider } from 'react-apollo/test-utils';
import { cloneDeep } from 'lodash/fp';
import { SiemNavigation } from '../../components/navigation';
import { wait } from '../../lib/helpers';

import { InputsModelId } from '../../store/inputs/constants';

jest.mock('../../lib/settings/use_kibana_ui_setting');

jest.mock('ui/documentation_links', () => ({
  documentationLinks: {
    kibana: 'http://www.example.com',
  },
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

// Suppress warnings about "act" until async/await syntax is supported: https://github.com/facebook/react/issues/14769
/* eslint-disable no-console */
const originalError = console.error;

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
    filterQuery: '',
  };

  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });
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
});
