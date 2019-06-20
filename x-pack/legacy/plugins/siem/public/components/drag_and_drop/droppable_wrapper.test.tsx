/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';

import { mockBrowserFields, mocksSource } from '../../containers/source/mock';
import { TestProviders } from '../../mock';

import { DragDropContextWrapper } from './drag_drop_context_wrapper';
import { DroppableWrapper } from './droppable_wrapper';

describe('DroppableWrapper', () => {
  describe('rendering', () => {
    test('it renders against the snapshot', () => {
      const message = 'draggable wrapper content';

      const wrapper = shallow(
        <TestProviders>
          <MockedProvider mocks={{}} addTypename={false}>
            <DragDropContextWrapper browserFields={mockBrowserFields}>
              <DroppableWrapper droppableId="testing">{message}</DroppableWrapper>
            </DragDropContextWrapper>
          </MockedProvider>
        </TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders the children', () => {
      const message = 'draggable wrapper content';

      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocksSource} addTypename={false}>
            <DragDropContextWrapper browserFields={mockBrowserFields}>
              <DroppableWrapper droppableId="testing">{message}</DroppableWrapper>
            </DragDropContextWrapper>
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(message);
    });
  });
});
