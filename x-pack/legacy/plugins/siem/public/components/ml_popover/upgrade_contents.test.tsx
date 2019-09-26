/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { UpgradeContents } from './upgrade_contents';

describe('FilterGroup', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(<UpgradeContents />);
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
