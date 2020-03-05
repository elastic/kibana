/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';

import { mockBrowserFields, mocksSource } from '../../containers/source/mock';
import { TestProviders } from '../../mock';
import { mockDataProviders } from '../timeline/data_providers/mock/mock_data_providers';
import { DragDropContextWrapper } from './drag_drop_context_wrapper';
import { DraggableWrapper, ConditionalPortal } from './draggable_wrapper';
import { useMountAppended } from '../../utils/use_mount_appended';

describe('DraggableWrapper', () => {
  const dataProvider = mockDataProviders[0];
  const message = 'draggable wrapper content';
  const mount = useMountAppended();

  describe('rendering', () => {
    test('it renders against the snapshot', () => {
      const wrapper = shallow(
        <TestProviders>
          <MockedProvider mocks={{}} addTypename={false}>
            <DragDropContextWrapper browserFields={mockBrowserFields}>
              <DraggableWrapper dataProvider={dataProvider} render={() => message} />
            </DragDropContextWrapper>
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('DraggableWrapper')).toMatchSnapshot();
    });

    test('it renders the children passed to the render prop', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocksSource} addTypename={false}>
            <DragDropContextWrapper browserFields={mockBrowserFields}>
              <DraggableWrapper dataProvider={dataProvider} render={() => message} />
            </DragDropContextWrapper>
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(message);
    });
  });

  describe('text truncation styling', () => {
    test('it applies text truncation styling when truncate IS specified (implicit: and the user is not dragging)', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocksSource} addTypename={false}>
            <DragDropContextWrapper browserFields={mockBrowserFields}>
              <DraggableWrapper dataProvider={dataProvider} render={() => message} truncate />
            </DragDropContextWrapper>
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="draggable-truncatable-content"]').exists()).toEqual(
        true
      );
    });

    test('it does NOT apply text truncation styling when truncate is NOT specified', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocksSource} addTypename={false}>
            <DragDropContextWrapper browserFields={mockBrowserFields}>
              <DraggableWrapper dataProvider={dataProvider} render={() => message} />
            </DragDropContextWrapper>
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="draggable-truncatable-content"]').exists()).toEqual(
        false
      );
    });
  });
});

describe('ConditionalPortal', () => {
  const mount = useMountAppended();
  const props = {
    usePortal: false,
    registerProvider: jest.fn(),
    isDragging: true,
  };

  it(`doesn't call registerProvider is NOT isDragging`, () => {
    mount(
      <ConditionalPortal {...props} isDragging={false}>
        <div />
      </ConditionalPortal>
    );

    expect(props.registerProvider.mock.calls.length).toEqual(0);
  });

  it('calls registerProvider when isDragging', () => {
    mount(
      <ConditionalPortal {...props}>
        <div />
      </ConditionalPortal>
    );

    expect(props.registerProvider.mock.calls.length).toEqual(1);
  });
});
