/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { FilterGroup } from './filter_group';

describe('FilterGroup', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <FilterGroup
        showCustomJobs={true}
        setShowCustomJobs={jest.fn()}
        showElasticJobs={true}
        setShowElasticJobs={jest.fn()}
        setFilterQuery={jest.fn()}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('when you click filter onChange is called and filter updated', () => {
    const mockSetShowAllJobs = jest.fn();
    const wrapper = mount(
      <FilterGroup
        showCustomJobs={false}
        setShowCustomJobs={mockSetShowAllJobs}
        showElasticJobs={false}
        setShowElasticJobs={mockSetShowAllJobs}
        setFilterQuery={jest.fn()}
      />
    );

    wrapper
      .find('[data-test-subj="show-elastic-jobs-filter-button"]')
      .first()
      .simulate('click');
    wrapper.update();

    expect(mockSetShowAllJobs.mock.calls[0]).toEqual([true]);
  });
});
