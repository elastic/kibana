/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { navTabs } from '../../../pages/home/home_navigations';
import { SiemPageName } from '../../../pages/home/types';
import { navTabsHostDetails } from '../../../pages/hosts/details/nav_tabs';
import { HostsTableType } from '../../../store/hosts/model';
import { RouteSpyState } from '../../../utils/route/types';
import { CONSTANTS } from '../../url_state/constants';
import { TabNavigationComponent } from './';
import { TabNavigationProps } from './types';

jest.mock('ui/new_platform');

describe('Tab Navigation', () => {
  const pageName = SiemPageName.hosts;
  const hostName = 'siem-window';
  const tabName = HostsTableType.authentications;
  const pathName = `/${pageName}/${hostName}/${tabName}`;

  describe('Page Navigation', () => {
    const mockProps: TabNavigationProps & RouteSpyState = {
      pageName,
      pathName,
      detailName: undefined,
      search: '',
      tabName,
      navTabs,
      [CONSTANTS.timerange]: {
        global: {
          [CONSTANTS.timerange]: {
            from: 1558048243696,
            fromStr: 'now-24h',
            kind: 'relative',
            to: 1558134643697,
            toStr: 'now',
          },
          linkTo: ['timeline'],
        },
        timeline: {
          [CONSTANTS.timerange]: {
            from: 1558048243696,
            fromStr: 'now-24h',
            kind: 'relative',
            to: 1558134643697,
            toStr: 'now',
          },
          linkTo: ['global'],
        },
      },
      [CONSTANTS.appQuery]: { query: 'host.name:"siem-es"', language: 'kuery' },
      [CONSTANTS.filters]: [],
      [CONSTANTS.timeline]: {
        id: '',
        isOpen: false,
      },
    };
    test('it mounts with correct tab highlighted', () => {
      const wrapper = mount(<TabNavigationComponent {...mockProps} />);
      const hostsTab = wrapper.find('EuiTab[data-test-subj="navigation-hosts"]');
      expect(hostsTab.prop('isSelected')).toBeTruthy();
    });
    test('it changes active tab when nav changes by props', () => {
      const wrapper = mount(<TabNavigationComponent {...mockProps} />);
      const networkTab = () => wrapper.find('EuiTab[data-test-subj="navigation-network"]').first();
      expect(networkTab().prop('isSelected')).toBeFalsy();
      wrapper.setProps({
        pageName: 'network',
        pathName: '/network',
        tabName: undefined,
      });
      wrapper.update();
      expect(networkTab().prop('isSelected')).toBeTruthy();
    });
    test('it carries the url state in the link', () => {
      const wrapper = mount(<TabNavigationComponent {...mockProps} />);
      const firstTab = wrapper.find('EuiTab[data-test-subj="navigation-network"]');
      expect(firstTab.props().href).toBe(
        "#/link-to/network?query=(language:kuery,query:'host.name:%22siem-es%22')&timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))"
      );
    });
  });

  describe('Table Navigation', () => {
    const mockHasMlUserPermissions = true;
    const mockProps: TabNavigationProps & RouteSpyState = {
      pageName: 'hosts',
      pathName: '/hosts',
      detailName: undefined,
      search: '',
      tabName: HostsTableType.authentications,
      navTabs: navTabsHostDetails(hostName, mockHasMlUserPermissions),
      [CONSTANTS.timerange]: {
        global: {
          [CONSTANTS.timerange]: {
            from: 1558048243696,
            fromStr: 'now-24h',
            kind: 'relative',
            to: 1558134643697,
            toStr: 'now',
          },
          linkTo: ['timeline'],
        },
        timeline: {
          [CONSTANTS.timerange]: {
            from: 1558048243696,
            fromStr: 'now-24h',
            kind: 'relative',
            to: 1558134643697,
            toStr: 'now',
          },
          linkTo: ['global'],
        },
      },
      [CONSTANTS.appQuery]: { query: 'host.name:"siem-es"', language: 'kuery' },
      [CONSTANTS.filters]: [],
      [CONSTANTS.timeline]: {
        id: '',
        isOpen: false,
      },
    };
    test('it mounts with correct tab highlighted', () => {
      const wrapper = mount(<TabNavigationComponent {...mockProps} />);
      const tableNavigationTab = wrapper.find(
        `EuiTab[data-test-subj="navigation-${HostsTableType.authentications}"]`
      );

      expect(tableNavigationTab.prop('isSelected')).toBeTruthy();
    });
    test('it changes active tab when nav changes by props', () => {
      const wrapper = mount(<TabNavigationComponent {...mockProps} />);
      const tableNavigationTab = () =>
        wrapper.find(`[data-test-subj="navigation-${HostsTableType.events}"]`).first();
      expect(tableNavigationTab().prop('isSelected')).toBeFalsy();
      wrapper.setProps({
        pageName: SiemPageName.hosts,
        pathName: `/${SiemPageName.hosts}`,
        tabName: HostsTableType.events,
      });
      wrapper.update();
      expect(tableNavigationTab().prop('isSelected')).toBeTruthy();
    });
    test('it carries the url state in the link', () => {
      const wrapper = mount(<TabNavigationComponent {...mockProps} />);
      const firstTab = wrapper.find(
        `EuiTab[data-test-subj="navigation-${HostsTableType.authentications}"]`
      );
      expect(firstTab.props().href).toBe(
        `#/${pageName}/${hostName}/${HostsTableType.authentications}?query=(language:kuery,query:'host.name:%22siem-es%22')&timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))`
      );
    });
  });
});
