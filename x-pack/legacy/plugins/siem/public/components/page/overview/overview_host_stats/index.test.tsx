/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { OverviewHostStats } from '.';
import { mockData } from './mock';

describe('Overview Host Stat Data', () => {
  describe('rendering', () => {
    test('it renders the default OverviewHostStats', () => {
      const wrapper = shallow(<OverviewHostStats data={mockData.OverviewHost} loading={false} />);
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
  describe('loading', () => {
    test('it does not show loading indicator when not loading', () => {
      const wrapper = shallow(<OverviewHostStats data={mockData.OverviewHost} loading={false} />);
      const loadingWrapper = wrapper
        .dive()
        .find('[data-test-subj="stat-loader-description"]')
        .first()
        .childAt(0);
      expect(loadingWrapper.prop('isLoading')).toBe(false);
    });
    test('it does show loading indicator when not loading', () => {
      const wrapper = shallow(<OverviewHostStats data={mockData.OverviewHost} loading={true} />);
      const loadingWrapper = wrapper
        .dive()
        .find('[data-test-subj="stat-loader-description"]')
        .first()
        .childAt(0);
      expect(loadingWrapper.prop('isLoading')).toBe(true);
    });
  });
});
