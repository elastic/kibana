/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { Router } from 'react-router-dom';
import { MockedProvider } from 'react-apollo/test-utils';

import '../../mock/match_media';
import '../../mock/ui_settings';
import { apolloClientObservable, mockGlobalState, TestProviders } from '../../mock';
import { IPDetailsComponent, IPDetails } from './ip_details';
import { FlowTarget } from '../../graphql/types';
import { createStore, State } from '../../store';
import { cloneDeep } from 'lodash/fp';
import { mocksSource } from '../../containers/source/mock';

type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';

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

const getMockHistory = (ip: string) => ({
  length: 2,
  location: {
    pathname: `/network/ip/${ip}`,
    search: '',
    state: '',
    hash: '',
  },
  action: pop,
  push: jest.fn(),
  replace: jest.fn(),
  go: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  block: jest.fn(),
  createHref: jest.fn(),
  listen: jest.fn(),
});

const getMockProps = (ip: string) => ({
  filterQuery: 'coolQueryhuh?',
  flowTarget: FlowTarget.source,
  history: getMockHistory(ip),
  location: {
    pathname: `/network/ip/${ip}`,
    search: '',
    state: '',
    hash: '',
  },
  match: { params: { ip }, isExact: true, path: '', url: '' },
});

jest.mock('ui/documentation_links', () => ({
  documentationLinks: {
    siem: 'http://www.example.com',
  },
}));
// Suppress warnings about "act" until async/await syntax is supported: https://github.com/facebook/react/issues/14769
/* eslint-disable no-console */
const originalError = console.error;

describe('Ip Details', () => {
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });
  const state: State = mockGlobalState;

  let store = createStore(state, apolloClientObservable);

  beforeEach(() => {
    store = createStore(state, apolloClientObservable);
    localSource = cloneDeep(mocksSource);
  });
  test('it renders', () => {
    const wrapper = shallow(<IPDetailsComponent {...getMockProps('123.456.78.90')} />);
    expect(
      wrapper
        .dive()
        .find('[data-test-subj="ip-details-page"]')
        .exists()
    ).toBe(true);
  });

  test('it matches the snapshot', () => {
    const wrapper = shallow(<IPDetailsComponent {...getMockProps('123.456.78.90')} />);
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('it renders ipv6 headline', async () => {
    localSource[0].result.data.source.status.indicesExist = true;
    const ip = 'fe80--24ce-f7ff-fede-a571';
    const wrapper = mount(
      <TestProviders store={store}>
        <MockedProvider mocks={localSource} addTypename={false}>
          <Router history={getMockHistory(ip)}>
            <IPDetails {...getMockProps(ip)} />
          </Router>
        </MockedProvider>
      </TestProviders>
    );
    // Why => https://github.com/apollographql/react-apollo/issues/1711
    await new Promise(resolve => setTimeout(resolve));
    wrapper.update();
    expect(
      wrapper
        .find('[data-test-subj="ip-details-headline"] [data-test-subj="page_headline_title"]')
        .text()
    ).toEqual('fe80::24ce:f7ff:fede:a571');
  });
});
