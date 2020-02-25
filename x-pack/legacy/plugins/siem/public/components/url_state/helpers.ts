/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { decode, encode } from 'rison-node';
import * as H from 'history';
import { QueryString } from 'ui/utils/query_string';

import { Query, esFilters } from '../../../../../../../src/plugins/data/public';

import { SiemPageName } from '../../pages/home/types';
import { inputsSelectors, State, timelineSelectors } from '../../store';
import { UrlInputsModel } from '../../store/inputs/model';
import { TimelineUrl } from '../../store/timeline/model';
import { formatDate } from '../super_date_picker';
import { NavTab } from '../navigation/types';
import { CONSTANTS, UrlStateType } from './constants';
import {
  LocationTypes,
  UrlStateContainerPropTypes,
  ReplaceStateInLocation,
  UpdateUrlStateString,
} from './types';

export const decodeRisonUrlState = <T>(value: string | undefined): T | null => {
  try {
    return value ? ((decode(value) as unknown) as T) : null;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('rison decoder error')) {
      return null;
    }
    throw error;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const encodeRisonUrlState = (state: any) => encode(state);

export const getQueryStringFromLocation = (search: string) => search.substring(1);

export const getParamFromQueryString = (queryString: string, key: string): string | undefined => {
  const queryParam = QueryString.decode(queryString)[key];
  return Array.isArray(queryParam) ? queryParam[0] : queryParam;
};

export const replaceStateKeyInQueryString = <T>(stateKey: string, urlState: T) => (
  queryString: string
): string => {
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

export const replaceQueryStringInLocation = (
  location: H.Location,
  queryString: string
): H.Location => {
  if (queryString === getQueryStringFromLocation(location.search)) {
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
  } else if (pageName === SiemPageName.detections) {
    return 'detections';
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
  } else if (pageName === SiemPageName.detections) {
    return CONSTANTS.detectionsPage;
  } else if (pageName === SiemPageName.timelines) {
    return CONSTANTS.timelinePage;
  }
  return CONSTANTS.unknown;
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

export const updateTimerangeUrl = (
  timeRange: UrlInputsModel,
  isInitializing: boolean
): UrlInputsModel => {
  if (timeRange.global.timerange.kind === 'relative') {
    timeRange.global.timerange.from = formatDate(timeRange.global.timerange.fromStr);
    timeRange.global.timerange.to = formatDate(timeRange.global.timerange.toStr, { roundUp: true });
  }
  if (timeRange.timeline.timerange.kind === 'relative' && isInitializing) {
    timeRange.timeline.timerange.from = formatDate(timeRange.timeline.timerange.fromStr);
    timeRange.timeline.timerange.to = formatDate(timeRange.timeline.timerange.toStr, {
      roundUp: true,
    });
  }
  return timeRange;
};

export const updateUrlStateString = ({
  isInitializing,
  history,
  newUrlStateString,
  pathName,
  search,
  updateTimerange,
  urlKey,
}: UpdateUrlStateString): string => {
  if (urlKey === CONSTANTS.appQuery) {
    const queryState = decodeRisonUrlState<Query>(newUrlStateString);
    if (queryState != null && queryState.query === '') {
      return replaceStateInLocation({
        history,
        pathName,
        search,
        urlStateToReplace: '',
        urlStateKey: urlKey,
      });
    }
  } else if (urlKey === CONSTANTS.timerange && updateTimerange) {
    const queryState = decodeRisonUrlState<UrlInputsModel>(newUrlStateString);
    if (queryState != null && queryState.global != null) {
      return replaceStateInLocation({
        history,
        pathName,
        search,
        urlStateToReplace: updateTimerangeUrl(queryState, isInitializing),
        urlStateKey: urlKey,
      });
    }
  } else if (urlKey === CONSTANTS.filters) {
    const queryState = decodeRisonUrlState<esFilters.Filter[]>(newUrlStateString);
    if (isEmpty(queryState)) {
      return replaceStateInLocation({
        history,
        pathName,
        search,
        urlStateToReplace: '',
        urlStateKey: urlKey,
      });
    }
  } else if (urlKey === CONSTANTS.timeline) {
    const queryState = decodeRisonUrlState<TimelineUrl>(newUrlStateString);
    if (queryState != null && queryState.id === '') {
      return replaceStateInLocation({
        history,
        pathName,
        search,
        urlStateToReplace: '',
        urlStateKey: urlKey,
      });
    }
  }
  return search;
};

export const replaceStateInLocation = <T>({
  history,
  urlStateToReplace,
  urlStateKey,
  pathName,
  search,
}: ReplaceStateInLocation<T>) => {
  const newLocation = replaceQueryStringInLocation(
    {
      hash: '',
      pathname: pathName,
      search,
      state: '',
    },
    replaceStateKeyInQueryString(urlStateKey, urlStateToReplace)(getQueryStringFromLocation(search))
  );
  if (history) {
    history.replace(newLocation);
  }
  return newLocation.search;
};
