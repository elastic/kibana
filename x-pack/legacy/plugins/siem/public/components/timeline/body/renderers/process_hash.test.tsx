/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../../../mock';

import { ProcessHash } from './process_hash';

describe('ProcessHash', () => {
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

  test('displays the processHashMd5, processHashSha1, and processHashSha256 when they are all provided', () => {
    const wrapper = mount(
      <TestProviders>
        <ProcessHash
          contextId="test"
          eventId="1"
          processHashMd5="[processHashMd5]"
          processHashSha1="[processHashSha1]"
          processHashSha256="[processHashSha256]"
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('[processHashSha256][processHashSha1][processHashMd5]');
  });

  test('displays nothing when processHashMd5, processHashSha1, and processHashSha256 are all undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ProcessHash
          contextId="test"
          eventId="1"
          processHashMd5={undefined}
          processHashSha1={undefined}
          processHashSha256={undefined}
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('');
  });

  test('displays just processHashMd5 when the other hashes are undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ProcessHash
          contextId="test"
          eventId="1"
          processHashMd5="[processHashMd5]"
          processHashSha1={undefined}
          processHashSha256={undefined}
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('[processHashMd5]');
  });

  test('displays just processHashSha1 when the other hashes are undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ProcessHash
          contextId="test"
          eventId="1"
          processHashMd5={undefined}
          processHashSha1="[processHashSha1]"
          processHashSha256={undefined}
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('[processHashSha1]');
  });

  test('displays just processHashSha256 when the other hashes are undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ProcessHash
          contextId="test"
          eventId="1"
          processHashMd5={undefined}
          processHashSha1={undefined}
          processHashSha256="[processHashSha256]"
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(wrapper.text()).toEqual('[processHashSha256]');
  });
});
