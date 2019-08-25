/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { decode, encode, RisonValue } from 'rison-node';
import { Location } from 'history';
import { QueryString } from 'ui/utils/query_string';
import { CONSTANTS } from './constants';
import { LocationTypes, UrlStateType } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const decodeRisonUrlState = (value: string | undefined): RisonValue | any | undefined => {
  try {
    return value ? decode(value) : undefined;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('rison decoder error')) {
      return {};
    }
    throw error;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const encodeRisonUrlState = (state: any) => encode(state);

export const getQueryStringFromLocation = (location: Location) => location.search.substring(1);

export const getParamFromQueryString = (queryString: string, key: string): string | undefined => {
  const queryParam = QueryString.decode(queryString)[key];
  return Array.isArray(queryParam) ? queryParam[0] : queryParam;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const replaceStateKeyInQueryString = <UrlState extends any>(
  stateKey: string,
  urlState: UrlState | undefined
) => (queryString: string) => {
  const previousQueryValues = QueryString.decode(queryString);
  if (
    urlState == null ||
    (typeof urlState === 'string' && urlState === '') ||
    (urlState && urlState.filterQuery === null) ||
    (urlState && urlState.filterQuery != null && urlState.filterQuery.expression === '')
  ) {
    delete previousQueryValues[stateKey];
    return QueryString.encode({
      ...previousQueryValues,
    });
  }

  // ಠ_ಠ Code was copied from x-pack/legacy/plugins/infra/public/utils/url_state.tsx ಠ_ಠ
  // Remove this if these utilities are promoted to kibana core
  const encodedUrlState =
    typeof urlState !== 'undefined' ? encodeRisonUrlState(urlState) : undefined;
  return QueryString.encode({
    ...previousQueryValues,
    [stateKey]: encodedUrlState,
  });
};

export const replaceQueryStringInLocation = (location: Location, queryString: string): Location => {
  if (queryString === getQueryStringFromLocation(location)) {
    return location;
  } else {
    return {
      ...location,
      search: `?${queryString}`,
    };
  }
};

export const getUrlType = (pathname: string): UrlStateType => {
  const removeSlash = pathname.replace(/\/$/, '');
  const trailingPath = removeSlash.match(/([^\/]+$)/);
  if (trailingPath !== null) {
    if (trailingPath[0] === 'hosts' || pathname.match(/^\/hosts\/.+$/) != null) {
      return 'host';
    } else if (trailingPath[0] === 'network' || pathname.match(/^\/network\/.+$/) != null) {
      return 'network';
    } else if (trailingPath[0] === 'overview') {
      return 'overview';
    } else if (trailingPath[0] === 'timelines') {
      return 'timeline';
    }
  }
  return 'overview';
};

export const getCurrentLocation = (pathname: string): LocationTypes => {
  const removeSlash = pathname.replace(/\/$/, '');
  const trailingPath = removeSlash.match(/([^\/]+$)/);
  if (trailingPath !== null) {
    if (trailingPath[0] === 'hosts') {
      return CONSTANTS.hostsPage;
    } else if (pathname.match(/^\/hosts\/.+$/) != null) {
      return CONSTANTS.hostsDetails;
    } else if (trailingPath[0] === 'network') {
      return CONSTANTS.networkPage;
    } else if (pathname.match(/^\/network\/.+$/) != null) {
      return CONSTANTS.networkDetails;
    } else if (trailingPath[0] === 'overview') {
      return CONSTANTS.overviewPage;
    } else if (trailingPath[0] === 'timelines') {
      return CONSTANTS.timelinePage;
    }
  }
  return CONSTANTS.unknown;
  // throw new Error(`'Unknown pathName in else if statement': ${pathname}`);
};

export const isKqlForRoute = (
  pathname: string,
  queryLocation: LocationTypes | null = null
): boolean => {
  const currentLocation = getCurrentLocation(pathname);
  if (
    (currentLocation === CONSTANTS.hostsPage && queryLocation === CONSTANTS.hostsPage) ||
    (currentLocation === CONSTANTS.networkPage && queryLocation === CONSTANTS.networkPage) ||
    (currentLocation === CONSTANTS.hostsDetails && queryLocation === CONSTANTS.hostsDetails) ||
    (currentLocation === CONSTANTS.networkDetails && queryLocation === CONSTANTS.networkDetails)
  ) {
    return true;
  }
  return false;
};
