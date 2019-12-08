/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../../../mock';

import { FileDraggable } from './file_draggable';

describe('FileDraggable', () => {
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

  test('it prefers fileName and filePath over endgameFileName and endgameFilePath when all of them are provided', () => {
    const wrapper = mount(
      <TestProviders>
        <FileDraggable
          contextId="test"
          endgameFileName="[endgameFileName]"
          endgameFilePath="[endgameFilePath]"
          eventId="1"
          fileName="[fileName]"
          filePath="[filePath]"
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('[fileName]in[filePath]');
  });

  test('it returns an empty string when none of the files or paths are provided', () => {
    const wrapper = mount(
      <TestProviders>
        <FileDraggable
          contextId="test"
          endgameFileName={undefined}
          endgameFilePath={undefined}
          eventId="1"
          fileName={undefined}
          filePath={undefined}
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('');
  });

  test('it renders just the endgameFileName if only endgameFileName is provided', () => {
    const wrapper = mount(
      <TestProviders>
        <FileDraggable
          contextId="test"
          endgameFileName="[endgameFileName]"
          endgameFilePath={undefined}
          eventId="1"
          fileName={undefined}
          filePath={undefined}
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('[endgameFileName]');
  });

  test('it renders "in endgameFilePath" if only endgameFilePath is provided', () => {
    const wrapper = mount(
      <TestProviders>
        <FileDraggable
          contextId="test"
          endgameFileName={undefined}
          endgameFilePath="[endgameFilePath]"
          eventId="1"
          fileName={undefined}
          filePath={undefined}
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('in[endgameFilePath]');
  });

  test('it renders just the filename if only fileName is provided', () => {
    const wrapper = mount(
      <TestProviders>
        <FileDraggable
          contextId="test"
          endgameFileName={undefined}
          endgameFilePath={undefined}
          eventId="1"
          fileName="[fileName]"
          filePath={undefined}
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('[fileName]');
  });

  test('it renders "in filePath" if only filePath is provided', () => {
    const wrapper = mount(
      <TestProviders>
        <FileDraggable
          contextId="test"
          endgameFileName={undefined}
          endgameFilePath={undefined}
          eventId="1"
          fileName={undefined}
          filePath="[filePath]"
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('in[filePath]');
  });
});
