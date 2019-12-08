/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';

import { TestProviders } from '../../mock';
import { PreferenceFormattedBytes } from '../formatted_bytes';

import { Bytes } from '.';

jest.mock('../../lib/settings/use_kibana_ui_setting');

describe('Bytes', () => {
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

  test('it renders the expected formatted bytes', () => {
    const wrapper = mount(
      <TestProviders>
        <Bytes contextId="test" eventId="abc" fieldName="network.bytes" value={`1234567`} />
      </TestProviders>,
      { attachTo: root }
    );
    expect(
      wrapper
        .find(PreferenceFormattedBytes)
        .first()
        .text()
    ).toEqual('1.2MB');
  });
});
