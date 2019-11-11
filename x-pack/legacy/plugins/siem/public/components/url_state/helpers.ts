/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { decode, encode, RisonValue } from 'rison-node';
import { Location } from 'history';
import { QueryString } from 'ui/utils/query_string';
import { Query, esFilters } from 'src/plugins/data/public';

import { inputsSelectors, State, timelineSelectors } from '../../store';
import { SiemPageName } from '../../pages/home/types';
import { NavTab } from '../navigation/types';
import { CONSTANTS, UrlStateType } from './constants';
import { LocationTypes, UrlStateContainerPropTypes } from './types';

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
  if (urlState == null || (typeof urlState === 'string' && urlState === '')) {
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

export const getUrlType = (pageName: string): UrlStateType => {
  if (pageName === SiemPageName.overview) {
    return 'overview';
  } else if (pageName === SiemPageName.hosts) {
    return 'host';
  } else if (pageName === SiemPageName.network) {
    return 'network';
  } else if (pageName === SiemPageName.detectionEngine) {
    return 'detection-engine';
  } else if (pageName === SiemPageName.timelines) {
    return 'timeline';
  }
  return 'overview';
};

export const getTitle = (
  pageName: string,
  detailName: string | undefined,
  navTabs: Record<string, NavTab>
): string => {
  if (detailName != null) return detailName;
  return navTabs[pageName] != null ? navTabs[pageName].name : '';
};

export const getCurrentLocation = (
  pageName: string,
  detailName: string | undefined
): LocationTypes => {
  if (pageName === SiemPageName.overview) {
    return CONSTANTS.overviewPage;
  } else if (pageName === SiemPageName.hosts) {
    if (detailName != null) {
      return CONSTANTS.hostsDetails;
    }
    return CONSTANTS.hostsPage;
  } else if (pageName === SiemPageName.network) {
    if (detailName != null) {
      return CONSTANTS.networkDetails;
    }
    return CONSTANTS.networkPage;
  } else if (pageName === SiemPageName.detectionEngine) {
    return CONSTANTS.detectionEnginePage;
  } else if (pageName === SiemPageName.timelines) {
    return CONSTANTS.timelinePage;
  }
  return CONSTANTS.unknown;
};

export const isKqlForRoute = (
  pageName: string,
  detailName: string | undefined,
  queryLocation: LocationTypes | null = null
): boolean => {
  const currentLocation = getCurrentLocation(pageName, detailName);
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

export const makeMapStateToProps = () => {
  const getInputsSelector = inputsSelectors.inputsSelector();
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  const getGlobalSavedQuerySelector = inputsSelectors.globalSavedQuerySelector();
  const getTimelines = timelineSelectors.getTimelines();
  const mapStateToProps = (state: State, { pageName, detailName }: UrlStateContainerPropTypes) => {
    const inputState = getInputsSelector(state);
    const { linkTo: globalLinkTo, timerange: globalTimerange } = inputState.global;
    const { linkTo: timelineLinkTo, timerange: timelineTimerange } = inputState.timeline;

    const timeline = Object.entries(getTimelines(state)).reduce(
      (obj, [timelineId, timelineObj]) => ({
        id: timelineObj.savedObjectId != null ? timelineObj.savedObjectId : '',
        isOpen: timelineObj.show,
      }),
      { id: '', isOpen: false }
    );

    let searchAttr: {
      [CONSTANTS.appQuery]?: Query;
      [CONSTANTS.filters]?: esFilters.Filter[];
      [CONSTANTS.savedQuery]?: string;
    } = {
      [CONSTANTS.appQuery]: getGlobalQuerySelector(state),
      [CONSTANTS.filters]: getGlobalFiltersQuerySelector(state),
    };
    const savedQuery = getGlobalSavedQuerySelector(state);
    if (savedQuery != null && savedQuery.id !== '') {
      searchAttr = {
        [CONSTANTS.savedQuery]: savedQuery.id,
      };
    }

    return {
      urlState: {
        ...searchAttr,
        [CONSTANTS.timerange]: {
          global: {
            [CONSTANTS.timerange]: globalTimerange,
            linkTo: globalLinkTo,
          },
          timeline: {
            [CONSTANTS.timerange]: timelineTimerange,
            linkTo: timelineLinkTo,
          },
        },
        [CONSTANTS.timeline]: timeline,
      },
    };
  };

  return mapStateToProps;
};
