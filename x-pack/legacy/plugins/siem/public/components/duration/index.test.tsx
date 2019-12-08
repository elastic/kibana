/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';

import { TestProviders } from '../../mock';
import { ONE_MILLISECOND_AS_NANOSECONDS } from '../formatted_duration/helpers';

import { Duration } from '.';

describe('Duration', () => {
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

  test('it renders the expected formatted duration', () => {
    const wrapper = mount(
      <TestProviders>
        <Duration
          contextId="test"
          eventId="abc"
          fieldName="event.duration"
          value={`${ONE_MILLISECOND_AS_NANOSECONDS}`}
        />
      </TestProviders>,
      { attachTo: root }
    );
    expect(
      wrapper
        .find('[data-test-subj="formatted-duration"]')
        .first()
        .text()
    ).toEqual('1ms');
  });
});
