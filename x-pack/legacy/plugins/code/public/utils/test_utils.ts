/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action, History, Location } from 'history';
import { match } from 'react-router-dom';

interface LocationParam {
  pathname?: string;
  search?: string;
  hash?: string;
  state?: string;
}

export function createLocation(location: LocationParam): Location {
  return {
    pathname: '',
    search: '',
    hash: '',
    state: '',
    ...location,
  };
}

interface MatchParam<Params> {
  path?: string;
  url?: string;
  isExact?: boolean;
  params: Params;
}

export function createMatch<Params>(m: MatchParam<Params>): match<Params> {
  return {
    path: '',
    url: '',
    isExact: true,
    ...m,
  };
}

interface HParam {
  length?: number;
  action: Action;
  location: Location;
}

export const mockFunction = jest.fn();

export function createHistory(h: HParam): History {
  return {
    length: 0,
    push: mockFunction,
    replace: mockFunction,
    go: mockFunction,
    goBack: mockFunction,
    goForward: mockFunction,
    listen: () => mockFunction,
    block: () => mockFunction,
    createHref: mockFunction,
    ...h,
  };
}
