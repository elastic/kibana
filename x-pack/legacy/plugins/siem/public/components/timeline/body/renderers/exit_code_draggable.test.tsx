/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../../../mock';

import { ExitCodeDraggable } from './exit_code_draggable';

describe('ExitCodeDraggable', () => {
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

  test('it renders the expected text and exit code, when both text and an endgameExitCode are provided', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable contextId="test" endgameExitCode="0" eventId="1" text="with exit code" />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('with exit code0');
  });

  test('it returns an empty string when text is provided, but endgameExitCode is undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable
          contextId="test"
          endgameExitCode={undefined}
          eventId="1"
          text="with exit code"
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('');
  });

  test('it returns an empty string when text is provided, but endgameExitCode is null', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable
          contextId="test"
          endgameExitCode={null}
          eventId="1"
          text="with exit code"
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('');
  });

  test('it returns an empty string when text is provided, but endgameExitCode is an empty string', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable contextId="test" endgameExitCode="" eventId="1" text="with exit code" />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('');
  });

  test('it renders just the exit code when text is undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable contextId="test" endgameExitCode="1" eventId="1" text={undefined} />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('1');
  });

  test('it renders just the exit code when text is null', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable contextId="test" endgameExitCode="1" eventId="1" text={null} />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('1');
  });

  test('it renders just the exit code when text is an empty string', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable contextId="test" endgameExitCode="1" eventId="1" text="" />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('1');
  });
});
