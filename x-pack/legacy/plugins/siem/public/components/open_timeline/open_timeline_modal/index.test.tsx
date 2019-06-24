/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import { mount, ReactWrapper } from 'enzyme';
import * as React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';

import { wait } from '../../../lib/helpers';
import { TestProviderWithoutDragAndDrop } from '../../../mock/test_providers';
import { mockOpenTimelineQueryResults } from '../../../mock/timeline_results';
import * as i18n from '../translations';

import { OpenTimelineModalButton } from '.';

const getStateChildComponent = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wrapper: ReactWrapper<any, Readonly<{}>, React.Component<{}, {}, any>>
): // eslint-disable-next-line @typescript-eslint/no-explicit-any
React.Component<{}, {}, any> =>
  wrapper
    .childAt(0)
    .childAt(0)
    .childAt(0)
    .childAt(0)
    .childAt(0)
    .childAt(0)
    .childAt(0)
    .instance();

describe('OpenTimelineModalButton', () => {
  test('it renders the expected button text', async () => {
    const wrapper = mount(
      <TestProviderWithoutDragAndDrop>
        <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
          <OpenTimelineModalButton onToggle={jest.fn()} />
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

  describe('statefulness', () => {
    test('defaults showModal to false', async () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <OpenTimelineModalButton onToggle={jest.fn()} />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      );

      await wait();

      wrapper.update();

      expect(get('showModal', getStateChildComponent(wrapper).state)).toEqual(false);
    });

    test('it sets showModal to true when the button is clicked', async () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <OpenTimelineModalButton onToggle={jest.fn()} />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      );

      await wait();

      wrapper
        .find('[data-test-subj="open-timeline-button"]')
        .first()
        .simulate('click');

      wrapper.update();

      expect(wrapper.find('div[data-test-subj="open-timeline-modal"].euiModal').length).toEqual(1);
    });

    test('it does NOT render the modal when showModal is false', async () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <OpenTimelineModalButton onToggle={jest.fn()} />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      );

      await wait();

      wrapper.update();

      expect(
        wrapper
          .find('[data-test-subj="open-timeline-modal"]')
          .first()
          .exists()
      ).toBe(false);
    });

    test('it renders the modal when showModal is true', async () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <OpenTimelineModalButton onToggle={jest.fn()} />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      );

      await wait();

      wrapper.update();

      wrapper
        .find('[data-test-subj="open-timeline-button"]')
        .first()
        .simulate('click');

      expect(
        wrapper
          .find('[data-test-subj="open-timeline-modal"]')
          .first()
          .exists()
      ).toBe(true);
    });
  });

  describe('onToggle prop', () => {
    test('it still correctly updates the showModal state if `onToggle` is not provided as a prop', async () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <OpenTimelineModalButton onToggle={jest.fn()} />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      );

      await wait();

      wrapper
        .find('[data-test-subj="open-timeline-button"]')
        .first()
        .simulate('click');

      wrapper.update();

      expect(get('showModal', getStateChildComponent(wrapper).state)).toEqual(true);
    });

    test('it invokes the optional onToggle function provided as a prop when the open timeline button is clicked', async () => {
      const onToggle = jest.fn();
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <OpenTimelineModalButton onToggle={onToggle} />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      );

      await wait();

      wrapper
        .find('[data-test-subj="open-timeline-button"]')
        .first()
        .simulate('click');

      wrapper.update();

      expect(onToggle).toBeCalled();
    });
  });
});
