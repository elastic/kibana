/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import chrome from 'ui/chrome';
import '../../../mock/match_media';
import { encodeIpv6 } from '../../../lib/helpers';

import { getBreadcrumbsForRoute, setBreadcrumbs } from '.';
import { HostsTableType } from '../../../store/hosts/model';
import { RouteSpyState, SiemRouteType } from '../../../utils/route/types';
import { TabNavigationProps } from '../tab_navigation/types';
import { NetworkRouteType } from '../../../pages/network/navigation/types';

jest.mock('ui/chrome', () => ({
  getBasePath: () => {
    return '<basepath>';
  },
  breadcrumbs: {
    set: jest.fn(),
  },
  getUiSettingsClient: () => ({
    get: jest.fn(),
  }),
}));

jest.mock('../../search_bar', () => ({
  siemFilterManager: {
    addFilters: jest.fn(),
  },
}));

const mockDefaultTab = (pageName: string): SiemRouteType | undefined => {
  switch (pageName) {
    case 'hosts':
      return HostsTableType.authentications;
    case 'network':
      return NetworkRouteType.flows;
    default:
      return undefined;
  }
};

const getMockObject = (
  pageName: string,
  pathName: string,
  detailName: string | undefined
): RouteSpyState & TabNavigationProps => ({
  detailName,
  navTabs: {
    hosts: {
      disabled: false,
      href: '#/link-to/hosts',
      id: 'hosts',
      name: 'Hosts',
      urlKey: 'host',
    },
    network: {
      disabled: false,
      href: '#/link-to/network',
      id: 'network',
      name: 'Network',
      urlKey: 'network',
    },
    overview: {
      disabled: false,
      href: '#/link-to/overview',
      id: 'overview',
      name: 'Overview',
      urlKey: 'overview',
    },
    timelines: {
      disabled: false,
      href: '#/link-to/timelines',
      id: 'timelines',
      name: 'Timelines',
      urlKey: 'timeline',
    },
  },
  pageName,
  pathName,
  search: '',
  tabName: mockDefaultTab(pageName) as HostsTableType,
  query: { query: '', language: 'kuery' },
  filters: [],
  timeline: {
    id: '',
    isOpen: false,
  },
  timerange: {
    global: {
      linkTo: ['timeline'],
      timerange: {
        from: 1558048243696,
        fromStr: 'now-24h',
        kind: 'relative',
        to: 1558134643697,
        toStr: 'now',
      },
    },
    timeline: {
      linkTo: ['global'],
      timerange: {
        from: 1558048243696,
        fromStr: 'now-24h',
        kind: 'relative',
        to: 1558134643697,
        toStr: 'now',
      },
    },
  },
});

describe('Navigation Breadcrumbs', () => {
  const hostName = 'siem-kibana';

  const ipv4 = '192.0.2.255';
  const ipv6 = '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff';
  const ipv6Encoded = encodeIpv6(ipv6);

  describe('getBreadcrumbsForRoute', () => {
    test('should return Host breadcrumbs when supplied host pathname', () => {
      const breadcrumbs = getBreadcrumbsForRoute(getMockObject('hosts', '/hosts', undefined));
      expect(breadcrumbs).toEqual([
        {
          href: '#/link-to/overview',
          text: 'SIEM',
        },
        {
          href:
            '#/link-to/hosts?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))',
          text: 'Hosts',
        },
        {
          href: '',
          text: 'Authentications',
        },
      ]);
    });

    test('should return Network breadcrumbs when supplied network pathname', () => {
      const breadcrumbs = getBreadcrumbsForRoute(getMockObject('network', '/network', undefined));
      expect(breadcrumbs).toEqual([
        { text: 'SIEM', href: '#/link-to/overview' },
        {
          text: 'Network',
          href:
            '#/link-to/network?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))',
        },
        {
          text: 'Flows',
          href: '',
        },
      ]);
    });

    test('should return Timelines breadcrumbs when supplied timelines pathname', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject('timelines', '/timelines', undefined)
      );
      expect(breadcrumbs).toEqual([
        { text: 'SIEM', href: '#/link-to/overview' },
        { text: 'Timelines', href: '' },
      ]);
    });

    test('should return Host Details breadcrumbs when supplied a pathname with hostName', () => {
      const breadcrumbs = getBreadcrumbsForRoute(getMockObject('hosts', '/hosts', hostName));
      expect(breadcrumbs).toEqual([
        { text: 'SIEM', href: '#/link-to/overview' },
        {
          text: 'Hosts',
          href:
            '#/link-to/hosts?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))',
        },
        {
          text: 'siem-kibana',
          href:
            '#/link-to/hosts/siem-kibana?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))',
        },
        { text: 'Authentications', href: '' },
      ]);
    });

    test('should return IP Details breadcrumbs when supplied pathname with ipv4', () => {
      const breadcrumbs = getBreadcrumbsForRoute(getMockObject('network', '/network', ipv4));
      expect(breadcrumbs).toEqual([
        { text: 'SIEM', href: '#/link-to/overview' },
        {
          text: 'Network',
          href:
            '#/link-to/network?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))',
        },
        {
          text: ipv4,
          href: `#/link-to/network/ip/${ipv4}/source?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))`,
        },
        { text: 'Flows', href: '' },
      ]);
    });

    test('should return IP Details breadcrumbs when supplied pathname with ipv6', () => {
      const breadcrumbs = getBreadcrumbsForRoute(getMockObject('network', '/network', ipv6Encoded));
      expect(breadcrumbs).toEqual([
        { text: 'SIEM', href: '#/link-to/overview' },
        {
          text: 'Network',
          href:
            '#/link-to/network?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))',
        },
        {
          text: ipv6,
          href: `#/link-to/network/ip/${ipv6Encoded}/source?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))`,
        },
        { text: 'Flows', href: '' },
      ]);
    });
  });
  describe('setBreadcrumbs()', () => {
    test('should call chrome breadcrumb service with correct breadcrumbs', () => {
      setBreadcrumbs(getMockObject('hosts', '/hosts', hostName));
      expect(chrome.breadcrumbs.set).toBeCalledWith([
        { text: 'SIEM', href: '#/link-to/overview' },
        {
          text: 'Hosts',
          href:
            '#/link-to/hosts?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))',
        },
        {
          text: 'siem-kibana',
          href:
            '#/link-to/hosts/siem-kibana?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))',
        },
        { text: 'Authentications', href: '' },
      ]);
    });
  });
});
