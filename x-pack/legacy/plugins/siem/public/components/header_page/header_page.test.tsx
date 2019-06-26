/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { HeaderPage } from './index';

describe('rendering', () => {
  test('renders correctly', () => {
    const wrapper = shallow(
      <HeaderPage
        badgeLabel="Beta"
        badgeTooltip="My test tooltip."
        subtitle="My Test Subtitle"
        title="My Test Title"
      >
        <p>{'My test supplement.'}</p>
      </HeaderPage>
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
