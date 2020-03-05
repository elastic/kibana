/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount } from 'enzyme';
import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import { ThemeProvider } from 'styled-components';

import { wait } from '../../../lib/helpers';
import { TestProviderWithoutDragAndDrop } from '../../../mock/test_providers';
import { mockInsertTimelineQueryResults } from '../../../mock/timeline_results';

import { InsertTimelinePopover } from '.';

jest.mock('../../../lib/kibana');
jest.mock('../../../utils/apollo_context', () => ({
  useApolloClient: () => ({}),
}));

describe('InsertTimelinePopover', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });

  test('it renders the expected modal', async () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockInsertTimelineQueryResults} addTypename={false}>
            <InsertTimelinePopover onClose={jest.fn()} />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      </ThemeProvider>
    );

    await wait();

    wrapper.update();

    expect(wrapper.find('div[data-test-subj="insert-timeline-modal"].euiPopover').length).toEqual(1);
  });
});
