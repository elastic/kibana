/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../../../mock';

import { ParentProcessDraggable } from './parent_process_draggable';

describe('ParentProcessDraggable', () => {
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

  test('displays the text, endgameParentProcessName, and processPpid when they are all provided', () => {
    const wrapper = mount(
      <TestProviders>
        <ParentProcessDraggable
          contextId="test"
          endgameParentProcessName="[endgameParentProcessName]"
          eventId="1"
          processPpid={456}
          text="via parent process"
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('via parent process[endgameParentProcessName](456)');
  });

  test('displays nothing when the text is provided, but endgameParentProcessName and processPpid are both undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ParentProcessDraggable
          contextId="test"
          endgameParentProcessName={undefined}
          eventId="1"
          processPpid={undefined}
          text="via parent process"
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('');
  });

  test('displays the text and processPpid when endgameParentProcessName is undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ParentProcessDraggable
          contextId="test"
          endgameParentProcessName={undefined}
          eventId="1"
          processPpid={456}
          text="via parent process"
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('via parent process(456)');
  });

  test('displays the processPpid when both endgameParentProcessName and text are undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ParentProcessDraggable
          contextId="test"
          endgameParentProcessName={undefined}
          eventId="1"
          processPpid={456}
          text={undefined}
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('(456)');
  });

  test('displays the text and endgameParentProcessName when processPpid is undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ParentProcessDraggable
          contextId="test"
          endgameParentProcessName="[endgameParentProcessName]"
          eventId="1"
          processPpid={undefined}
          text="via parent process"
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('via parent process[endgameParentProcessName]');
  });

  test('displays the endgameParentProcessName when both processPpid and text are undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ParentProcessDraggable
          contextId="test"
          endgameParentProcessName="[endgameParentProcessName]"
          eventId="1"
          processPpid={undefined}
          text={undefined}
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('[endgameParentProcessName]');
  });
});
