/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { HostsTableType } from '../../store/hosts/model';
import { RouteSpyState } from './types';
import { ManageRoutesSpy } from './manage_spy_routes';
import { SpyRouteComponent } from './spy_routes';
import { useRouteSpy } from './use_route_spy';

type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';

const defaultLocation = {
  hash: '',
  pathname: '/hosts',
  search: '',
  state: '',
};

export const mockHistory = {
  action: pop,
  block: jest.fn(),
  createHref: jest.fn(),
  go: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  length: 2,
  listen: jest.fn(),
  location: defaultLocation,
  push: jest.fn(),
  replace: jest.fn(),
};

const dispatchMock = jest.fn();
const mockRoutes: RouteSpyState = {
  pageName: '',
  detailName: undefined,
  tabName: undefined,
  search: '',
  pathName: '/',
  history: mockHistory,
};

const mockUseRouteSpy: jest.Mock = useRouteSpy as jest.Mock;
jest.mock('./use_route_spy', () => ({
  useRouteSpy: jest.fn(),
}));

describe('Spy Routes', () => {
  describe('At Initialization of the app', () => {
    beforeEach(() => {
      dispatchMock.mockReset();
      dispatchMock.mockClear();
    });
    test('Make sure we update search state first', () => {
      const pathname = '/';
      mockUseRouteSpy.mockImplementation(() => [mockRoutes, dispatchMock]);
      mount(
        <ManageRoutesSpy>
          <SpyRouteComponent
            location={{ hash: '', pathname, search: '?importantQueryString="really"', state: '' }}
            history={mockHistory}
            match={{
              isExact: false,
              path: pathname,
              url: pathname,
              params: {
                pageName: undefined,
                detailName: '',
                tabName: HostsTableType.hosts,
                search: '',
              },
            }}
          />
        </ManageRoutesSpy>
      );

      expect(dispatchMock.mock.calls[0]).toEqual([
        {
          type: 'updateSearch',
          search: '?importantQueryString="really"',
        },
      ]);
    });

    test('Make sure we update search state first and then update the route but keeping the initial search', () => {
      const pathname = '/hosts/allHosts';
      mockUseRouteSpy.mockImplementation(() => [mockRoutes, dispatchMock]);
      mount(
        <ManageRoutesSpy>
          <SpyRouteComponent
            location={{ hash: '', pathname, search: '?importantQueryString="really"', state: '' }}
            history={mockHistory}
            match={{
              isExact: false,
              path: pathname,
              url: pathname,
              params: {
                pageName: 'hosts',
                detailName: undefined,
                tabName: HostsTableType.hosts,
                search: '?IdoNotWantToSeeYou="true"',
              },
            }}
          />
        </ManageRoutesSpy>
      );

      expect(dispatchMock.mock.calls[0]).toEqual([
        {
          type: 'updateSearch',
          search: '?importantQueryString="really"',
        },
      ]);

      expect(dispatchMock.mock.calls[1]).toEqual([
        {
          route: {
            detailName: undefined,
            history: mockHistory,
            pageName: 'hosts',
            pathName: pathname,
            tabName: HostsTableType.hosts,
          },
          type: 'updateRouteWithOutSearch',
        },
      ]);
    });
  });

  describe('When app is running', () => {
    beforeEach(() => {
      dispatchMock.mockReset();
      dispatchMock.mockClear();
    });
    test('Update route should be updated when there is changed detected', () => {
      const pathname = '/hosts/allHosts';
      const newPathname = `hosts/${HostsTableType.authentications}`;
      mockUseRouteSpy.mockImplementation(() => [mockRoutes, dispatchMock]);
      const wrapper = mount(
        <SpyRouteComponent
          location={{ hash: '', pathname, search: '?importantQueryString="really"', state: '' }}
          history={mockHistory}
          match={{
            isExact: false,
            path: pathname,
            url: pathname,
            params: {
              pageName: 'hosts',
              detailName: undefined,
              tabName: HostsTableType.hosts,
              search: '?IdoNotWantToSeeYou="true"',
            },
          }}
        />
      );

      dispatchMock.mockReset();
      dispatchMock.mockClear();

      wrapper.setProps({
        location: {
          hash: '',
          pathname: newPathname,
          search: '?updated="true"',
          state: '',
        },
        match: {
          isExact: false,
          path: newPathname,
          url: newPathname,
          params: {
            pageName: 'hosts',
            detailName: undefined,
            tabName: HostsTableType.authentications,
            search: '',
          },
        },
      });
      wrapper.update();
      expect(dispatchMock.mock.calls[0]).toEqual([
        {
          route: {
            detailName: undefined,
            history: mockHistory,
            pageName: 'hosts',
            pathName: newPathname,
            tabName: HostsTableType.authentications,
            search: '?updated="true"',
          },
          type: 'updateRoute',
        },
      ]);
    });
  });
});
