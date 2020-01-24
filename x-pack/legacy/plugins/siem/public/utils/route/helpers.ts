/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import { createContext, Dispatch } from 'react';

import { RouteSpyState, RouteSpyAction } from './types';

export const initRouteSpy: RouteSpyState = {
  pageName: '',
  detailName: undefined,
  tabName: undefined,
  search: '',
  pathName: '/',
  state: undefined,
};

export const RouterSpyStateContext = createContext<[RouteSpyState, Dispatch<RouteSpyAction>]>([
  initRouteSpy,
  () => noop,
]);
