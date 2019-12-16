/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount } from 'enzyme';
import * as React from 'react';
import { MockedProvider } from '@apollo/client/testing';
import { ThemeProvider } from 'styled-components';
import { act } from '@testing-library/react';

import { wait } from '../../../lib/helpers';
import { TestProviderWithoutDragAndDrop } from '../../../mock/test_providers';
import { mockOpenTimelineQueryResults } from '../../../mock/timeline_results';

import { OpenTimelineModal } from '.';

jest.mock('../../../lib/settings/use_kibana_ui_setting');

describe('OpenTimelineModal', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });

  test('it renders the expected modal', async () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <OpenTimelineModal onClose={jest.fn()} />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      </ThemeProvider>
    );

    await act(() => wait());

    wrapper.update();

    expect(wrapper.find('div[data-test-subj="open-timeline-modal"].euiModal').length).toEqual(1);
  });
});
