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

import { TestProviders } from '../../mock';
import { mocksSource } from '../../containers/source/mock';
import { Overview } from './index';

jest.mock('../../lib/kibana');

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
          <MockedProvider addTypename={false} mocks={localSource}>
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
          <MockedProvider addTypename={false} mocks={localSource}>
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
