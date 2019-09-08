/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import * as React from 'react';

import { TabNavigation } from './';
import { TabNavigationProps } from './types';
import { navTabs, SiemPageName } from '../../../pages/home/home_navigations';
import { HostsTableType } from '../../../store/hosts/model';
import { navTabsHostDetails } from '../../../pages/hosts/hosts_navigations';
import { CONSTANTS } from '../../url_state/constants';
import { RouteSpyState } from '../../../utils/route/types';

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
      hosts: {
        filterQuery: null,
        queryLocation: null,
      },
      hostDetails: {
        filterQuery: null,
        queryLocation: null,
      },
      network: {
        filterQuery: {
          expression: 'host.name:"siem-es"',
          kind: 'kuery',
        },
        queryLocation: CONSTANTS.hostsPage,
      },
      [CONSTANTS.timelineId]: '',
    };
    test('it mounts with correct tab highlighted', () => {
      const wrapper = shallow(<TabNavigation {...mockProps} />);
      const hostsTab = wrapper.find('[data-test-subj="navigation-hosts"]');
      expect(hostsTab.prop('isSelected')).toBeTruthy();
    });
    test('it changes active tab when nav changes by props', () => {
      const wrapper = shallow(<TabNavigation {...mockProps} />);
      const networkTab = () => wrapper.find('[data-test-subj="navigation-network"]');
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
      const wrapper = shallow(<TabNavigation {...mockProps} />);
      const firstTab = wrapper.find('[data-test-subj="navigation-link-network"]');
      expect(firstTab.props().href).toBe(
        "#/link-to/network?kqlQuery=(filterQuery:(expression:'host.name:%22siem-es%22',kind:kuery),queryLocation:hosts.page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))"
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
      network: {
        filterQuery: null,
        queryLocation: null,
      },
      hosts: {
        filterQuery: null,
        queryLocation: null,
      },
      hostDetails: {
        filterQuery: {
          expression: 'host.name:"siem-es"',
          kind: 'kuery',
        },
        queryLocation: CONSTANTS.hostsPage,
      },
      [CONSTANTS.timelineId]: '',
    };
    test('it mounts with correct tab highlighted', () => {
      const wrapper = shallow(<TabNavigation {...mockProps} />);
      const tableNavigationTab = wrapper.find(
        `[data-test-subj="navigation-${HostsTableType.authentications}"]`
      );

      expect(tableNavigationTab.prop('isSelected')).toBeTruthy();
    });
    test('it changes active tab when nav changes by props', () => {
      const wrapper = shallow(<TabNavigation {...mockProps} />);
      const tableNavigationTab = () =>
        wrapper.find(`[data-test-subj="navigation-${HostsTableType.events}"]`);
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
      const wrapper = shallow(<TabNavigation {...mockProps} />);
      const firstTab = wrapper.find(
        `[data-test-subj="navigation-link-${HostsTableType.authentications}"]`
      );
      expect(firstTab.props().href).toBe(
        `#/${pageName}/${hostName}/${HostsTableType.authentications}?kqlQuery=(filterQuery:(expression:'host.name:%22siem-es%22',kind:kuery),queryLocation:hosts.page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))`
      );
    });
  });
});
