/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { cloneDeep } from 'lodash/fp';
import * as React from 'react';
import { Router } from 'react-router-dom';
import { MockedProvider } from 'react-apollo/test-utils';
import { ActionCreator } from 'typescript-fsa';

import '../../../mock/match_media';

import { mocksSource } from '../../../containers/source/mock';
import { FlowTarget } from '../../../graphql/types';
import { useKibanaCore } from '../../../lib/compose/kibana_core';
import { apolloClientObservable, mockGlobalState, TestProviders } from '../../../mock';
import { mockUiSettings } from '../../../mock/ui_settings';
import { createStore, State } from '../../../store';
import { InputsModelId } from '../../../store/inputs/constants';

import { IPDetailsComponent, IPDetails } from './index';

jest.mock('../../../lib/settings/use_kibana_ui_setting');

type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';

type GlobalWithFetch = NodeJS.Global & { fetch: jest.Mock };

const mockUseKibanaCore = useKibanaCore as jest.Mock;
jest.mock('../../../lib/compose/kibana_core');
mockUseKibanaCore.mockImplementation(() => ({
  uiSettings: mockUiSettings,
}));

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar
jest.mock('../../../components/search_bar', () => ({
  SiemSearchBar: () => null,
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

const to = new Date('2018-03-23T18:49:23.132Z').valueOf();
const from = new Date('2018-03-24T03:33:52.253Z').valueOf();
const getMockProps = (ip: string) => ({
  to,
  from,
  isInitializing: false,
  setQuery: jest.fn(),
  query: { query: 'coolQueryhuh?', language: 'keury' },
  filters: [],
  flowTarget: FlowTarget.source,
  history: getMockHistory(ip),
  location: {
    pathname: `/network/ip/${ip}`,
    search: '',
    state: '',
    hash: '',
  },
  detailName: ip,
  match: { params: { detailName: ip, search: '' }, isExact: true, path: '', url: '' },
  setAbsoluteRangeDatePicker: (jest.fn() as unknown) as ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>,
  setIpDetailsTablesActivePageToZero: (jest.fn() as unknown) as ActionCreator<null>,
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
    (global as GlobalWithFetch).fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => {
          return null;
        },
      })
    );
  });

  afterAll(() => {
    console.error = originalError;
    delete (global as GlobalWithFetch).fetch;
  });
  const state: State = mockGlobalState;

  let store = createStore(state, apolloClientObservable);

  beforeEach(() => {
    store = createStore(state, apolloClientObservable);
    localSource = cloneDeep(mocksSource);
  });
  test('it renders', () => {
    const wrapper = shallow(<IPDetailsComponent {...getMockProps('123.456.78.90')} />);
    expect(wrapper.find('[data-test-subj="ip-details-page"]').exists()).toBe(true);
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
