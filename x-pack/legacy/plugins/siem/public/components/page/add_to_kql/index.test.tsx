/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '@kbn/es-query';
import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import {
  apolloClientObservable,
  mockGlobalState,
  TestProviders,
  mockIndexPattern,
} from '../../../mock';
import { createStore, State } from '../../../store';
import { siemFilterManager } from '../../search_bar';
import { AddToKql } from '.';

interface MockSiemFilterManager {
  addFilters: (filters: Filter[]) => void;
}
const mockSiemFilterManager: MockSiemFilterManager = siemFilterManager as MockSiemFilterManager;
jest.mock('../../search_bar', () => ({
  siemFilterManager: {
    addFilters: jest.fn(),
  },
}));
const mockAddFilters = jest.fn();
mockSiemFilterManager.addFilters = mockAddFilters;

describe('AddToKql Component', () => {
  const state: State = mockGlobalState;
  let store = createStore(state, apolloClientObservable);

  beforeEach(() => {
    store = createStore(state, apolloClientObservable);
  });

  test('Rendering', async () => {
    const wrapper = shallow(
      <TestProviders store={store}>
        <AddToKql
          id="global"
          indexPattern={mockIndexPattern}
          filter={{
            meta: {
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'host.name',
              value: 'siem-kibana',
              params: {
                query: 'siem-kibana',
              },
            },
            query: {
              match: {
                'host.name': {
                  query: 'siem-kibana',
                  type: 'phrase',
                },
              },
            },
          }}
        >
          <>{'siem-kibana'}</>
        </AddToKql>
      </TestProviders>
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('Rendering tooltip', async () => {
    const wrapper = shallow(
      <TestProviders store={store}>
        <AddToKql
          id="global"
          indexPattern={mockIndexPattern}
          filter={{
            meta: {
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'host.name',
              value: 'siem-kibana',
              params: {
                query: 'siem-kibana',
              },
            },
            query: {
              match: {
                'host.name': {
                  query: 'siem-kibana',
                  type: 'phrase',
                },
              },
            },
          }}
        >
          <>{'siem-kibana'}</>
        </AddToKql>
      </TestProviders>
    );

    wrapper.simulate('mouseenter');
    wrapper.update();
    expect(wrapper.find('[data-test-subj="hover-actions-container"] svg').first()).toBeTruthy();
  });

  test('Functionality with inputs state', async () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <AddToKql
          id="global"
          indexPattern={mockIndexPattern}
          filter={{
            meta: {
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'host.name',
              value: 'siem-kibana',
              params: {
                query: 'siem-kibana',
              },
            },
            query: {
              match: {
                'host.name': {
                  query: 'siem-kibana',
                  type: 'phrase',
                },
              },
            },
          }}
        >
          <>{'siem-kibana'}</>
        </AddToKql>
      </TestProviders>
    );

    wrapper
      .simulate('mouseenter')
      .find('[data-test-subj="hover-actions-container"] .euiToolTipAnchor svg')
      .first()
      .simulate('click');
    wrapper.update();

    expect(mockAddFilters.mock.calls[0][0]).toEqual({
      meta: {
        alias: null,
        disabled: false,
        key: 'host.name',
        negate: false,
        params: {
          query: 'siem-kibana',
        },
        type: 'phrase',
        value: 'siem-kibana',
      },
      query: {
        match: {
          'host.name': {
            query: 'siem-kibana',
            type: 'phrase',
          },
        },
      },
    });
  });
});
