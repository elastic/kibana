/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import * as React from 'react';
import { PopoverDescriptionComponent } from './popover_description';

describe('JobsTableFilters', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(<PopoverDescriptionComponent />);
    expect(wrapper).toMatchSnapshot();
  });
});
