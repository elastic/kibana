/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../../mock';
import { FlowTargetSelectConnected } from './index';
import { FlowTarget } from '../../../../graphql/types';

describe.skip('Flow Target Select Connected', () => {
  test('renders correctly against snapshot flowTarget source', () => {
    const wrapper = mount(
      <TestProviders>
        <FlowTargetSelectConnected flowTarget={FlowTarget.source} />
      </TestProviders>
    );
    expect(wrapper.find('FlowTargetSelectConnected')).toMatchSnapshot();
  });

  test('renders correctly against snapshot flowTarget destination', () => {
    const wrapper = mount(
      <TestProviders>
        <FlowTargetSelectConnected flowTarget={FlowTarget.destination} />
      </TestProviders>
    );
    expect(wrapper.find('FlowTargetSelectConnected')).toMatchSnapshot();
  });
});
