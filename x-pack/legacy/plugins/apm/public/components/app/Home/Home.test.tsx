/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { Home } from '../Home';
import { MockApmPluginContextWrapper } from '../../../utils/testHelpers';

describe('Home component', () => {
  it('should render services', () => {
    expect(
      shallow(
        <MockApmPluginContextWrapper>
          <Home tab="services" />
        </MockApmPluginContextWrapper>
      )
    ).toMatchSnapshot();
  });

  it('should render traces', () => {
    expect(
      shallow(
        <MockApmPluginContextWrapper>
          <Home tab="traces" />
        </MockApmPluginContextWrapper>
      )
    ).toMatchSnapshot();
  });
});
