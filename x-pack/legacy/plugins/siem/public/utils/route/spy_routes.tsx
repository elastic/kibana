/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as H from 'history';
import React, { createContext, memo, useContext, useEffect, Dispatch, useReducer } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { noop } from 'redux-saga/utils';
import { isEqual } from 'lodash/fp';
import { HostsTableType } from '../../store/hosts/model';

export interface RouteSpyState {
  pageName: string;
  detailName: string | undefined;
  tabName: HostsTableType | undefined;
  search: string;
  pathName: string;
  history?: H.History;
}

const initRouteSpy: RouteSpyState = {
  pageName: '',
  detailName: undefined,
  tabName: undefined,
  search: '',
  pathName: '/',
};

export interface RouteSpyAction {
  type: 'updateRoute';
  route: RouteSpyState;
}

export const RouterSpyStateContext = createContext<[RouteSpyState, Dispatch<RouteSpyAction>]>([
  initRouteSpy,
  () => noop,
]);

export const useRouteSpy = () => useContext(RouterSpyStateContext);

interface ManageRoutesSpyProps {
  children: React.ReactNode;
}

export const ManageRoutesSpy = ({ children }: ManageRoutesSpyProps) => {
  const reducerSpyRoute = (state: RouteSpyState, action: RouteSpyAction) => {
    switch (action.type) {
      case 'updateRoute':
        return action.route;
      default:
        return state;
    }
  };

  return (
    <RouterSpyStateContext.Provider value={useReducer(reducerSpyRoute, initRouteSpy)}>
      {children}
    </RouterSpyStateContext.Provider>
  );
};

type SpyRouteProps = RouteComponentProps<{
  pageName: string;
  detailName: string;
  tabName: HostsTableType;
  search: string;
}>;

const SpyRouteComponent = memo<SpyRouteProps & { location: Location }>(
  ({
    location: { pathname, search },
    history,
    match: {
      params: { pageName, detailName, tabName },
    },
  }) => {
    const [route, dispatch] = useRouteSpy();
    useEffect(() => {
      if (pageName && !isEqual(route.pathName, pathname)) {
        dispatch({
          type: 'updateRoute',
          route: {
            pageName,
            detailName,
            tabName,
            search,
            pathName: pathname,
            history,
          },
        });
      }
    }, [pathname, search, pageName, detailName, tabName]);
    return null;
  }
);

export const SpyRoute = withRouter(SpyRouteComponent);
