/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import * as React from 'react';

import { TabNavigation } from './';
import { navTabs, SiemPageName } from '../../../pages/home/home_navigations';
import { HostsTableType } from '../../../store/hosts/model';
import { navTabsHostDetails } from '../../../pages/hosts/hosts_navigations';

describe('Tab Navigation', () => {
  describe.skip('Page Navigation', () => {
    test('it mounts with correct tab highlighted', () => {
      const wrapper = shallow(
        <TabNavigation location={'/hosts'} search={'?thisisareallycoolsearch'} navTabs={navTabs} />
      );
      const hostsTab = wrapper.find('[data-test-subj="navigation-hosts"]');

      expect(hostsTab.prop('isSelected')).toBeTruthy();
    });
    test('it changes active tab when nav changes by props', () => {
      const wrapper = shallow(
        <TabNavigation location={'/hosts'} search={'?thisisareallycoolsearch'} navTabs={navTabs} />
      );
      const networkTab = () => wrapper.find('[data-test-subj="navigation-network"]');
      expect(networkTab().prop('isSelected')).toBeFalsy();
      wrapper.setProps({ location: '/network', match: {} });
      wrapper.update();
      expect(networkTab().prop('isSelected')).toBeTruthy();
    });
    test('it carries the url state in the link', () => {
      const wrapper = shallow(
        <TabNavigation location={'/hosts'} search={'?thisisareallycoolsearch'} navTabs={navTabs} />
      );
      const firstTab = wrapper.find('[data-test-subj="navigation-link-network"]');
      expect(firstTab.props().href).toBe('#/link-to/network?thisisareallycoolsearch');
    });
  });

  describe('Table Navigation', () => {
    const pageName = SiemPageName.hosts;
    const hostName = 'siem-window';
    const tabName = HostsTableType.authentications;
    const location = `/${pageName}/${hostName}/${tabName}`;
    const mockMatch = {
      params: {
        pageName,
        hostName,
        tabName,
      },
    };
    test('it mounts with correct tab highlighted', () => {
      const wrapper = shallow(
        <TabNavigation
          location={location}
          search={'?thisisareallycoolsearch'}
          navTabs={navTabsHostDetails(hostName)}
          match={mockMatch}
        />
      );
      const tableNavigationTab = wrapper.find(
        `[data-test-subj="navigation-${HostsTableType.authentications}"]`
      );

      expect(tableNavigationTab.prop('isSelected')).toBeTruthy();
    });
    test('it changes active tab when nav changes by props', () => {
      const newMatch = {
        params: {
          pageName: SiemPageName.hosts,
          hostName,
          tabName: HostsTableType.events,
        },
      };
      const wrapper = shallow(
        <TabNavigation
          location={location}
          search={'?thisisareallycoolsearch'}
          navTabs={navTabsHostDetails(hostName)}
          match={mockMatch}
        />
      );
      const tableNavigationTab = () =>
        wrapper.find(`[data-test-subj="navigation-${HostsTableType.events}"]`);
      expect(tableNavigationTab().prop('isSelected')).toBeFalsy();
      wrapper.setProps({ location: `/${SiemPageName.hosts}`, match: newMatch });
      wrapper.update();
      expect(tableNavigationTab().prop('isSelected')).toBeTruthy();
    });
    test('it carries the url state in the link', () => {
      const wrapper = shallow(
        <TabNavigation
          location={location}
          search={'?thisisareallycoolsearch'}
          navTabs={navTabsHostDetails(hostName)}
          match={mockMatch}
        />
      );
      const firstTab = wrapper.find(
        `[data-test-subj="navigation-link-${HostsTableType.authentications}"]`
      );
      expect(firstTab.props().href).toBe(
        `#/${pageName}/${hostName}/${HostsTableType.authentications}?thisisareallycoolsearch`
      );
    });
  });
});
