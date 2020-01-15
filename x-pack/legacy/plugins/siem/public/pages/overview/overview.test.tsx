/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import { MemoryRouter } from 'react-router-dom';

import '../../mock/match_media';
import { TestProviders } from '../../mock';
import { mocksSource } from '../../containers/source/mock';
import { Overview } from './index';

jest.mock('ui/chrome', () => ({
  getBasePath: () => {
    return '<basepath>';
  },
  getKibanaVersion: () => {
    return 'v8.0.0';
  },
  breadcrumbs: {
    set: jest.fn(),
  },
  getUiSettingsClient: () => ({
    get: jest.fn(),
  }),
}));

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

describe('Overview', () => {
  describe('rendering', () => {
    beforeEach(() => {
      localSource = cloneDeep(mocksSource);
    });

    test('it renders the Setup Instructions text when no index is available', async () => {
      localSource[0].result.data.source.status.indicesExist = false;
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={localSource} addTypename={false}>
            <MemoryRouter>
              <Overview />
            </MemoryRouter>
          </MockedProvider>
        </TestProviders>
      );
      // Why => https://github.com/apollographql/react-apollo/issues/1711
      await new Promise(resolve => setTimeout(resolve));
      wrapper.update();
      expect(wrapper.find('[data-test-subj="empty-page"]').exists()).toBe(true);
    });

    test('it DOES NOT render the Getting started text when an index is available', async () => {
      localSource[0].result.data.source.status.indicesExist = true;
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={localSource} addTypename={false}>
            <MemoryRouter>
              <Overview />
            </MemoryRouter>
          </MockedProvider>
        </TestProviders>
      );
      // Why => https://github.com/apollographql/react-apollo/issues/1711
      await new Promise(resolve => setTimeout(resolve));
      wrapper.update();
      expect(wrapper.find('[data-test-subj="empty-page"]').exists()).toBe(false);
    });
  });
});
