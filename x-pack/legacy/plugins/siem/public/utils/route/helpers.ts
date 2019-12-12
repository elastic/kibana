/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import { createContext, Dispatch } from 'react';

import { RouteSpyState, RouteSpyAction } from './types';
import { NetworkRouteType } from '../../pages/network/navigation/types';
import { HostsTableType } from '../../store/hosts/model';

export const initRouteSpy: RouteSpyState<HostsTableType | NetworkRouteType> = {
  pageName: '',
  detailName: undefined,
  tabName: undefined,
  search: '',
  pathName: '/',
};

export const RouterSpyStateContext = createContext<
  [
    RouteSpyState<HostsTableType | NetworkRouteType>,
    Dispatch<RouteSpyAction<HostsTableType | NetworkRouteType>>
  ]
>([initRouteSpy, () => noop]);
