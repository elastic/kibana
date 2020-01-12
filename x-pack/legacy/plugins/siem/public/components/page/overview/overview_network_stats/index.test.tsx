/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { OverviewNetworkStats } from '.';
import { mockData } from './mock';

describe('Overview Network Stat Data', () => {
  describe('rendering', () => {
    test('it renders the default OverviewNetworkStats', () => {
      const wrapper = shallow(
        <OverviewNetworkStats data={mockData.OverviewNetwork} loading={false} />
      );
      expect(wrapper).toMatchSnapshot();
    });
  });
  describe('loading', () => {
    test('it does not show loading indicator when not loading', () => {
      const wrapper = shallow(
        <OverviewNetworkStats data={mockData.OverviewNetwork} loading={false} />
      );

      const loadingWrapper = wrapper
        .dive()
        .find('[data-test-subj="network-stat-auditbeatSocket"]')
        .first()
        .childAt(0);
      expect(loadingWrapper.prop('isLoading')).toBe(false);
    });
    test('it does show loading indicator when not loading', () => {
      const wrapper = shallow(
        <OverviewNetworkStats data={mockData.OverviewNetwork} loading={true} />
      );
      const loadingWrapper = wrapper
        .dive()
        .find('[data-test-subj="network-stat-auditbeatSocket"]')
        .first()
        .childAt(0);
      expect(loadingWrapper.prop('isLoading')).toBe(true);
    });
  });
});
