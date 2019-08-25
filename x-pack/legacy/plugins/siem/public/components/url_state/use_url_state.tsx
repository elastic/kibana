/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { get, isEqual, difference } from 'lodash/fp';
import { useEffect, useRef } from 'react';

import { convertKueryToElasticSearchQuery } from '../../lib/keury';
import { InputsModelId, TimeRangeKinds } from '../../store/inputs/constants';
import {
  AbsoluteTimeRange,
  LinkTo,
  RelativeTimeRange,
  UrlInputsModel,
} from '../../store/inputs/model';

import { CONSTANTS } from './constants';
import {
  replaceQueryStringInLocation,
  getQueryStringFromLocation,
  replaceStateKeyInQueryString,
  getParamFromQueryString,
  decodeRisonUrlState,
  isKqlForRoute,
  getCurrentLocation,
  getUrlType,
} from './helpers';
import { normalizeTimeRange } from './normalize_time_range';
import {
  UrlStateContainerPropTypes,
  PreviousLocationUrlState,
  URL_STATE_KEYS,
  KeyUrlState,
  KqlQuery,
  ALL_URL_STATE_KEYS,
  UrlStateType,
} from './types';
import { useApolloClient } from '../../utils/apollo_context';
import { queryTimelineById } from '../open_timeline/helpers';
import { HostsType } from '../../store/hosts/model';
import { NetworkType } from '../../store/network/model';

function usePrevious(value: PreviousLocationUrlState) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export const useUrlStateHooks = ({
  addGlobalLinkTo,
  addTimelineLinkTo,
  dispatch,
  location,
  indexPattern,
  isInitializing,
  history,
  removeGlobalLinkTo,
  removeTimelineLinkTo,
  setAbsoluteTimerange,
  setHostsKql,
  setNetworkKql,
  setRelativeTimerange,
  toggleTimelineLinkTo,
  updateTimeline,
  updateTimelineIsLoading,
  urlState,
}: UrlStateContainerPropTypes) => {
  const apolloClient = useApolloClient();
  const prevProps = usePrevious({ location, urlState });

  const replaceStateInLocation = (
    urlStateToReplace: UrlInputsModel | KqlQuery | string,
    urlStateKey: string,
    latestLocation: Location = location
  ) => {
    const newLocation = replaceQueryStringInLocation(
      location,
      replaceStateKeyInQueryString(urlStateKey, urlStateToReplace)(
        getQueryStringFromLocation(latestLocation)
      )
    );

    if (!isEqual(newLocation.search, latestLocation.search)) {
      history.replace(newLocation);
    }
    return newLocation;
  };

  const handleInitialize = (initLocation: Location, type: UrlStateType) => {
    let myLocation: Location = initLocation;
    URL_STATE_KEYS[type].forEach((urlKey: KeyUrlState) => {
      const newUrlStateString = getParamFromQueryString(
        getQueryStringFromLocation(initLocation),
        urlKey
      );
      if (newUrlStateString) {
        const kqlQueryStateData: KqlQuery = decodeRisonUrlState(newUrlStateString);
        if (
          urlKey === CONSTANTS.kqlQuery &&
          !isKqlForRoute(location.pathname, kqlQueryStateData.queryLocation) &&
          urlState[urlKey].queryLocation === kqlQueryStateData.queryLocation
        ) {
          myLocation = replaceStateInLocation(
            {
              filterQuery: null,
              queryLocation: null,
            },
            urlKey,
            myLocation
          );
        }
        if (isInitializing) {
          setInitialStateFromUrl(urlKey, newUrlStateString);
        }
      } else {
        myLocation = replaceStateInLocation(urlState[urlKey], urlKey, myLocation);
      }
    });
    difference(ALL_URL_STATE_KEYS, URL_STATE_KEYS[type]).forEach((urlKey: KeyUrlState) => {
      myLocation = replaceStateInLocation('', urlKey, myLocation);
    });
  };

  const setInitialStateFromUrl = (urlKey: KeyUrlState, newUrlStateString: string) => {
    if (urlKey === CONSTANTS.timerange) {
      const timerangeStateData: UrlInputsModel = decodeRisonUrlState(newUrlStateString);
      const globalId: InputsModelId = 'global';
      const globalLinkTo: LinkTo = { linkTo: get('global.linkTo', timerangeStateData) };
      const globalType: TimeRangeKinds = get('global.timerange.kind', timerangeStateData);
      if (globalType) {
        if (globalLinkTo.linkTo.length === 0) {
          dispatch(removeGlobalLinkTo());
        } else {
          dispatch(addGlobalLinkTo({ linkToId: 'timeline' }));
        }
        if (globalType === 'absolute') {
          const absoluteRange = normalizeTimeRange<AbsoluteTimeRange>(
            get('global.timerange', timerangeStateData)
          );
          dispatch(
            setAbsoluteTimerange({
              ...absoluteRange,
              id: globalId,
            })
          );
        }
        if (globalType === 'relative') {
          const relativeRange = normalizeTimeRange<RelativeTimeRange>(
            get('global.timerange', timerangeStateData)
          );
          dispatch(
            setRelativeTimerange({
              ...relativeRange,
              id: globalId,
            })
          );
        }
      }
      const timelineId: InputsModelId = 'timeline';
      const timelineLinkTo: LinkTo = { linkTo: get('timeline.linkTo', timerangeStateData) };
      const timelineType: TimeRangeKinds = get('timeline.timerange.kind', timerangeStateData);
      if (timelineType) {
        if (timelineLinkTo.linkTo.length === 0) {
          dispatch(removeTimelineLinkTo());
        } else {
          dispatch(addTimelineLinkTo({ linkToId: 'timeline' }));
        }
        if (timelineType === 'absolute') {
          const absoluteRange = normalizeTimeRange<AbsoluteTimeRange>(
            get('timeline.timerange', timerangeStateData)
          );
          dispatch(
            setAbsoluteTimerange({
              ...absoluteRange,
              id: timelineId,
            })
          );
        }
        if (timelineType === 'relative') {
          const relativeRange = normalizeTimeRange<RelativeTimeRange>(
            get('timeline.timerange', timerangeStateData)
          );
          dispatch(
            setRelativeTimerange({
              ...relativeRange,
              id: timelineId,
            })
          );
        }
      }
    }
    if (urlKey === CONSTANTS.kqlQuery && indexPattern != null) {
      const kqlQueryStateData: KqlQuery = decodeRisonUrlState(newUrlStateString);
      if (isKqlForRoute(location.pathname, kqlQueryStateData.queryLocation)) {
        const filterQuery = {
          kuery: kqlQueryStateData.filterQuery,
          serializedQuery: convertKueryToElasticSearchQuery(
            kqlQueryStateData.filterQuery ? kqlQueryStateData.filterQuery.expression : '',
            indexPattern
          ),
        };
        const page = getCurrentLocation(location.pathname);
        if ([CONSTANTS.hostsPage, CONSTANTS.hostsDetails].includes(page)) {
          dispatch(
            setHostsKql({
              filterQuery,
              hostsType: page === CONSTANTS.hostsPage ? HostsType.page : HostsType.details,
            })
          );
        } else if ([CONSTANTS.networkPage, CONSTANTS.networkDetails].includes(page)) {
          dispatch(
            setNetworkKql({
              filterQuery,
              networkType: page === CONSTANTS.networkPage ? NetworkType.page : NetworkType.details,
            })
          );
        }
      }
    }

    if (urlKey === CONSTANTS.timelineId) {
      const timelineId = decodeRisonUrlState(newUrlStateString);
      if (timelineId != null) {
        queryTimelineById({
          apolloClient,
          duplicate: false,
          timelineId,
          updateIsLoading: updateTimelineIsLoading,
          updateTimeline,
        });
      }
    }
  };

  useEffect(() => {
    const type: UrlStateType = getUrlType(location.pathname);
    if (isInitializing) {
      handleInitialize(initializeLocation(location), type);
    } else if (!isEqual(urlState, prevProps.urlState)) {
      let newLocation: Location = location;
      URL_STATE_KEYS[type].forEach((urlKey: KeyUrlState) => {
        if (!isEqual(urlState[urlKey], prevProps.urlState[urlKey])) {
          newLocation = replaceStateInLocation(urlState[urlKey], urlKey, newLocation);
        }
      });
    } else if (location.pathname !== prevProps.location.pathname) {
      handleInitialize(location, type);
    }
  });

  return null;
};

/*
 * Why are we doing that, it is because angular-ui router is encoding the `+` back to `2%B` after
 * that react router is getting the data with the `+` and convert to `2%B`
 * so we need to get back the value from the window location at initialization to avoid
 * to bring back the `+` in the kql
 */
export const initializeLocation = (location: Location): Location => {
  if (location.pathname === '/') {
    location.pathname = window.location.hash.substring(1);
  }
  const substringIndex =
    window.location.href.indexOf(`#${location.pathname}`) >= 0
      ? window.location.href.indexOf(`#${location.pathname}`) + location.pathname.length + 1
      : -1;
  if (substringIndex >= 0 && location.pathname !== '/') {
    location.search = window.location.href.substring(substringIndex);
  }
  return location;
};
