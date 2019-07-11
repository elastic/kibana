/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { FilterGroup } from './filter_group';

describe('FilterGroup', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <FilterGroup showAllJobs={true} setShowAllJobs={jest.fn()} setFilterQuery={jest.fn()} />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
