/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import 'jest-styled-components';
import * as React from 'react';

import { TruncatableTooltip } from '.';

describe('TruncatableTooltip', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <TruncatableTooltip content="Tooltip text">{'Tooltip anchor'}</TruncatableTooltip>
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
