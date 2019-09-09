/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import * as React from 'react';

import { CONSTANTS } from '../url_state/constants';
import { SiemNavigationComponent } from './';
import { setBreadcrumbs } from './breadcrumbs';
import { navTabs } from '../../pages/home/home_navigations';
import { TabNavigationProps } from './tab_navigation/types';
import { HostsTableType } from '../../store/hosts/model';
import { RouteSpyState } from '../../utils/route/types';

jest.mock('./breadcrumbs', () => ({
  setBreadcrumbs: jest.fn(),
}));

describe('SIEM Navigation', () => {
  const mockProps: TabNavigationProps & RouteSpyState = {
    pageName: 'hosts',
    pathName: '/hosts',
    detailName: undefined,
    search: '',
    tabName: HostsTableType.authentications,
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
      filterQuery: null,
      queryLocation: null,
    },
    [CONSTANTS.timelineId]: '',
  };
  const wrapper = shallow(<SiemNavigationComponent {...mockProps} />);
  test('it calls setBreadcrumbs with correct path on mount', () => {
    expect(setBreadcrumbs).toHaveBeenNthCalledWith(1, {
      detailName: undefined,
      hostDetails: { filterQuery: null, queryLocation: null },
      hosts: { filterQuery: null, queryLocation: null },
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
      network: { filterQuery: null, queryLocation: null },
      pageName: 'hosts',
      pathName: '/hosts',
      search: '',
      tabName: 'authentications',
      timelineId: '',
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
  });
  test('it calls setBreadcrumbs with correct path on update', () => {
    wrapper.setProps({
      pageName: 'network',
      pathName: '/network',
      tabName: undefined,
    });
    wrapper.update();
    expect(setBreadcrumbs).toHaveBeenNthCalledWith(2, {
      detailName: undefined,
      hostDetails: { filterQuery: null, queryLocation: null },
      hosts: { filterQuery: null, queryLocation: null },
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
      network: { filterQuery: null, queryLocation: null },
      pageName: 'network',
      pathName: '/network',
      search: '',
      tabName: undefined,
      timelineId: '',
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
  });
});
