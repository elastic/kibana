/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useReducer } from 'react';

import { ManageRoutesSpyProps, RouteSpyState, RouteSpyAction } from './types';
import { RouterSpyStateContext, initRouteSpy } from './helpers';
import { HostsTableType } from '../../store/hosts/model';
import { NetworkRouteType } from '../../pages/network/navigation/types';

export const ManageRoutesSpy = memo(({ children }: ManageRoutesSpyProps) => {
  const reducerSpyRoute = (
    state: RouteSpyState<HostsTableType | NetworkRouteType>,
    action: RouteSpyAction<HostsTableType | NetworkRouteType>
  ) => {
    switch (action.type) {
      case 'updateRoute':
        return action.route;
      case 'updateRouteWithOutSearch':
        return { ...state, ...action.route };
      case 'updateSearch':
        return { ...state, search: action.search };
      default:
        return state;
    }
  };

  return (
    <RouterSpyStateContext.Provider value={useReducer(reducerSpyRoute, initRouteSpy)}>
      {children}
    </RouterSpyStateContext.Provider>
  );
});
