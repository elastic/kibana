/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import * as React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import { MemoryRouter } from 'react-router-dom';

import { mocksSource } from '../../containers/source/mock';
import { TestProviders } from '../../mock';
import '../../mock/match_media';
import '../../mock/ui_settings';
import { DetectionEngineComponent } from './detection_engine';

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

describe('DetectionEngineComponent', () => {
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
              <DetectionEngineComponent />
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
              <DetectionEngineComponent />
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
