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
import { mockOpenTimelineQueryResults } from '../../../mock/timeline_results';
import * as i18n from '../translations';

import { OpenTimelineModalButton } from './open_timeline_modal_button';

describe('OpenTimelineModalButton', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });

  test('it renders the expected button text', async () => {
    const wrapper = mount(
      <TestProviderWithoutDragAndDrop>
        <MockedProvider addTypename={false} mocks={mockOpenTimelineQueryResults}>
          <OpenTimelineModalButton onClick={jest.fn()} />
        </MockedProvider>
      </TestProviderWithoutDragAndDrop>
    );

    await wait();

    wrapper.update();

    expect(
      wrapper
        .find('[data-test-subj="open-timeline-button"]')
        .first()
        .text()
    ).toEqual(i18n.OPEN_TIMELINE);
  });

  describe('onClick prop', () => {
    test('it invokes onClick function provided as a prop when the button is clicked', async () => {
      const onClick = jest.fn();
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <TestProviderWithoutDragAndDrop>
            <MockedProvider addTypename={false} mocks={mockOpenTimelineQueryResults}>
              <OpenTimelineModalButton onClick={onClick} />
            </MockedProvider>
          </TestProviderWithoutDragAndDrop>
        </ThemeProvider>
      );

      await wait();

      wrapper
        .find('[data-test-subj="open-timeline-button"]')
        .first()
        .simulate('click');

      wrapper.update();

      expect(onClick).toBeCalled();
    });
  });
});
