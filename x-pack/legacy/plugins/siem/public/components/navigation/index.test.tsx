/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import * as React from 'react';
import { RouteComponentProps } from 'react-router';

import { CONSTANTS } from '../url_state/constants';
import { SiemNavigationComponent } from './';
import { setBreadcrumbs } from './breadcrumbs';
import { navTabs } from '../../pages/home/home_navigations';
import { TabNavigationProps } from './type';

jest.mock('./breadcrumbs', () => ({
  setBreadcrumbs: jest.fn(),
}));

type Action = 'PUSH' | 'POP' | 'REPLACE';
type Props = RouteComponentProps & TabNavigationProps;
const pop: Action = 'POP';
describe('SIEM Navigation', () => {
  const location = {
    pathname: '/hosts',
    search: '',
    state: '',
    hash: '',
  };

  const mockProps: Props = {
    location,
    match: {
      isExact: true,
      params: {},
      path: '',
      url: '',
    },
    navTabs,
    history: {
      length: 2,
      location,
      action: pop,
      push: jest.fn(),
      replace: jest.fn(),
      go: jest.fn(),
      goBack: jest.fn(),
      goForward: jest.fn(),
      block: jest.fn(),
      createHref: jest.fn(),
      listen: jest.fn(),
    },
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
  const wrapper = shallow(<SiemNavigationComponent {...mockProps} navTabs={navTabs} />);
  test('it calls setBreadcrumbs with correct path on mount', () => {
    expect(setBreadcrumbs).toHaveBeenNthCalledWith(1, '/hosts', {});
  });
  test('it calls setBreadcrumbs with correct path on update', () => {
    wrapper.setProps({ location: { pathname: '/network' } });
    wrapper.update();
    expect(setBreadcrumbs).toHaveBeenNthCalledWith(2, '/network', {});
  });
});
