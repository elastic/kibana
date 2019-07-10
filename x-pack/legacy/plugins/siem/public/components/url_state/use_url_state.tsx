/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { throttle, get, isEqual } from 'lodash/fp';
import { useState, useEffect, useRef } from 'react';

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
  getCurrentLocation,
  decodeRisonUrlState,
  isKqlForRoute,
} from './helpers';
import { normalizeTimeRange } from './normalize_time_range';
import {
  UrlStateContainerPropTypes,
  PreviousLocationUrlState,
  URL_STATE_KEYS,
  KeyUrlState,
  LocationKeysType,
  LOCATION_KEYS,
  KqlQuery,
  LocationTypes,
  LOCATION_MAPPED_TO_MODEL,
} from './types';

function usePrevious(value: PreviousLocationUrlState) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export const useUrlStateHooks = ({
  location,
  indexPattern,
  history,
  setAbsoluteTimerange,
  setHostsKql,
  setNetworkKql,
  setRelativeTimerange,
  toggleTimelineLinkTo,
  urlState,
}: UrlStateContainerPropTypes) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const prevProps = usePrevious({ location, urlState });

  const replaceStateInLocation = throttle(
    1000,
    (urlStateToReplace: UrlInputsModel | KqlQuery, urlStateKey: string) => {
      const newLocation = replaceQueryStringInLocation(
        location,
        replaceStateKeyInQueryString(urlStateKey, urlStateToReplace)(
          getQueryStringFromLocation(location)
        )
      );
      if (newLocation !== location) {
        history.replace(newLocation);
      }
    }
  );

  const handleInitialize = (initLocation: Location) => {
    URL_STATE_KEYS.forEach((urlKey: KeyUrlState) => {
      const newUrlStateString = getParamFromQueryString(
        getQueryStringFromLocation(location),
        urlKey
      );
      if (newUrlStateString) {
        setInitialStateFromUrl(urlKey, newUrlStateString);
      } else {
        if (urlKey === CONSTANTS.timerange) {
          replaceStateInLocation(urlState[urlKey], urlKey);
        }
        if (urlKey === CONSTANTS.kqlQuery) {
          const currentLocation: LocationTypes = getCurrentLocation(location.pathname);
          if (currentLocation !== null) {
            replaceStateInLocation(urlState[CONSTANTS.kqlQuery][currentLocation], urlKey);
          }
        }
      }
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
          toggleTimelineLinkTo({ linkToId: 'global' });
        }
        if (globalType === 'absolute') {
          const absoluteRange = normalizeTimeRange<AbsoluteTimeRange>(
            get('global.timerange', timerangeStateData)
          );
          setAbsoluteTimerange({
            ...absoluteRange,
            id: globalId,
          });
        }
        if (globalType === 'relative') {
          const relativeRange = normalizeTimeRange<RelativeTimeRange>(
            get('global.timerange', timerangeStateData)
          );
          setRelativeTimerange({
            ...relativeRange,
            id: globalId,
          });
        }
      }
      const timelineId: InputsModelId = 'timeline';
      const timelineLinkTo: LinkTo = { linkTo: get('timeline.linkTo', timerangeStateData) };
      const timelineType: TimeRangeKinds = get('timeline.timerange.kind', timerangeStateData);
      if (timelineType) {
        if (timelineLinkTo.linkTo.length === 0) {
          toggleTimelineLinkTo({ linkToId: 'timeline' });
        }
        if (timelineType === 'absolute') {
          const absoluteRange = normalizeTimeRange<AbsoluteTimeRange>(
            get('timeline.timerange', timerangeStateData)
          );
          setAbsoluteTimerange({
            ...absoluteRange,
            id: timelineId,
          });
        }
        if (timelineType === 'relative') {
          const relativeRange = normalizeTimeRange<RelativeTimeRange>(
            get('timeline.timerange', timerangeStateData)
          );
          setRelativeTimerange({
            ...relativeRange,
            id: timelineId,
          });
        }
      }
    }
    if (urlKey === CONSTANTS.kqlQuery) {
      const kqlQueryStateData: KqlQuery = decodeRisonUrlState(newUrlStateString);
      if (isKqlForRoute(location.pathname, kqlQueryStateData)) {
        const filterQuery = {
          kuery: kqlQueryStateData.filterQuery,
          serializedQuery: convertKueryToElasticSearchQuery(
            kqlQueryStateData.filterQuery ? kqlQueryStateData.filterQuery.expression : '',
            indexPattern
          ),
        };
        if (
          kqlQueryStateData.queryLocation === CONSTANTS.hostsPage ||
          kqlQueryStateData.queryLocation === CONSTANTS.hostsDetails
        ) {
          const hostsType = LOCATION_MAPPED_TO_MODEL[kqlQueryStateData.queryLocation];
          setHostsKql({
            filterQuery,
            hostsType,
          });
        }
        if (
          kqlQueryStateData.queryLocation === CONSTANTS.networkPage ||
          kqlQueryStateData.queryLocation === CONSTANTS.networkDetails
        ) {
          const networkType = LOCATION_MAPPED_TO_MODEL[kqlQueryStateData.queryLocation];
          setNetworkKql({
            filterQuery,
            networkType,
          });
        }
      }
    }
  };

  useEffect(() => {
    if (isInitializing) {
      setIsInitializing(false);
      handleInitialize(initializeLocation(location));
    } else if (!isEqual(urlState, prevProps.urlState)) {
      URL_STATE_KEYS.forEach((urlKey: KeyUrlState) => {
        if (urlState[urlKey] && !isEqual(urlState[urlKey], prevProps.urlState[urlKey])) {
          if (urlKey === CONSTANTS.kqlQuery) {
            LOCATION_KEYS.forEach((queryLocation: LocationKeysType) => {
              if (
                !!urlState[CONSTANTS.kqlQuery][queryLocation] &&
                !isEqual(
                  urlState[CONSTANTS.kqlQuery][queryLocation],
                  prevProps.urlState[CONSTANTS.kqlQuery][queryLocation]
                )
              ) {
                replaceStateInLocation(
                  urlState[CONSTANTS.kqlQuery][queryLocation],
                  CONSTANTS.kqlQuery
                );
              }
            });
          } else {
            replaceStateInLocation(urlState[urlKey], urlKey);
          }
        }
      });
    } else if (location.pathname !== prevProps.location.pathname) {
      handleInitialize(location);
    }
  });

  return { isInitializing };
};

/*
 * Why are we doing that, it is because angular-ui router is encoding the `+` back to `2%B` after
 * that react router is getting the data with the `+` and convert to `2%B`
 * so we need to get back the value from the window location at initialization to avoid
 * to bring back the `+` in the kql
 */
export const initializeLocation = (location: Location): Location => {
  const substringIndex =
    window.location.href.indexOf(`#${location.pathname}`) >= 0
      ? window.location.href.indexOf(`#${location.pathname}`) + location.pathname.length + 1
      : -1;
  if (substringIndex >= 0) {
    location.search = window.location.href.substring(substringIndex);
  }
  return location;
};
