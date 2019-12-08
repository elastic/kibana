/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { TestProviders } from '../../../../mock';
import { ArgsComponent } from './args';

describe('Args', () => {
  let root: HTMLElement;

  // https://github.com/atlassian/react-beautiful-dnd/issues/1593
  beforeEach(() => {
    root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.removeChild(root);
  });

  describe('rendering', () => {
    test('it renders against shallow snapshot', () => {
      const wrapper = shallow(
        <ArgsComponent
          contextId="context-123"
          eventId="event-123"
          args={['arg1', 'arg2', 'arg3']}
          processTitle="process-title-1"
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it returns an empty string when both args and process title are undefined', () => {
      const wrapper = mount(
        <TestProviders>
          <ArgsComponent
            contextId="context-123"
            eventId="event-123"
            args={undefined}
            processTitle={undefined}
          />
        </TestProviders>,
        { attachTo: root }
      );
      expect(wrapper.text()).toEqual('');
    });

    test('it returns an empty string when both args and process title are null', () => {
      const wrapper = mount(
        <TestProviders>
          <ArgsComponent
            contextId="context-123"
            eventId="event-123"
            args={null}
            processTitle={null}
          />
        </TestProviders>,
        { attachTo: root }
      );
      expect(wrapper.text()).toEqual('');
    });

    test('it returns an empty string when args is an empty array, and title is an empty string', () => {
      const wrapper = mount(
        <TestProviders>
          <ArgsComponent contextId="context-123" eventId="event-123" args={[]} processTitle="" />
        </TestProviders>,
        { attachTo: root }
      );
      expect(wrapper.text()).toEqual('');
    });

    test('it returns args when args are provided, and process title is NOT provided', () => {
      const wrapper = mount(
        <TestProviders>
          <ArgsComponent
            contextId="context-123"
            eventId="event-123"
            args={['arg1', 'arg2', 'arg3']}
            processTitle={undefined}
          />
        </TestProviders>,
        { attachTo: root }
      );
      expect(wrapper.text()).toEqual('arg1arg2arg3');
    });

    test('it returns process title when process title is provided, and args is NOT provided', () => {
      const wrapper = mount(
        <TestProviders>
          <ArgsComponent
            contextId="context-123"
            eventId="event-123"
            args={null}
            processTitle="process-title-1"
          />
        </TestProviders>,
        { attachTo: root }
      );
      expect(wrapper.text()).toEqual('process-title-1');
    });

    test('it returns both args and process title, when both are provided', () => {
      const wrapper = mount(
        <TestProviders>
          <ArgsComponent
            contextId="context-123"
            eventId="event-123"
            args={['arg1', 'arg2', 'arg3']}
            processTitle="process-title-1"
          />
        </TestProviders>,
        { attachTo: root }
      );
      expect(wrapper.text()).toEqual('arg1arg2arg3process-title-1');
    });
  });
});
