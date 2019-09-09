/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { get, isEqual, difference, isEmpty } from 'lodash/fp';
import { useEffect, useRef, useState } from 'react';

import { convertKueryToElasticSearchQuery } from '../../lib/keury';
import { InputsModelId, TimeRangeKinds } from '../../store/inputs/constants';
import {
  AbsoluteTimeRange,
  LinkTo,
  RelativeTimeRange,
  UrlInputsModel,
} from '../../store/inputs/model';
import { useApolloClient } from '../../utils/apollo_context';
import { queryTimelineById } from '../open_timeline/helpers';
import { HostsType } from '../../store/hosts/model';
import { NetworkType } from '../../store/network/model';

import { CONSTANTS, UrlStateType } from './constants';
import {
  replaceQueryStringInLocation,
  getQueryStringFromLocation,
  replaceStateKeyInQueryString,
  getParamFromQueryString,
  decodeRisonUrlState,
  isKqlForRoute,
  getCurrentLocation,
  getUrlType,
  getTitle,
} from './helpers';
import { normalizeTimeRange } from './normalize_time_range';
import {
  UrlStateContainerPropTypes,
  PreviousLocationUrlState,
  URL_STATE_KEYS,
  KeyUrlState,
  KqlQuery,
  ALL_URL_STATE_KEYS,
} from './types';

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
  detailName,
  dispatch,
  indexPattern,
  history,
  navTabs,
  pageName,
  pathName,
  removeGlobalLinkTo,
  removeTimelineLinkTo,
  search,
  setAbsoluteTimerange,
  setHostsKql,
  setNetworkKql,
  setRelativeTimerange,
  tabName,
  updateTimeline,
  updateTimelineIsLoading,
  urlState,
}: UrlStateContainerPropTypes) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const apolloClient = useApolloClient();
  const prevProps = usePrevious({ pathName, urlState });

  const replaceStateInLocation = (
    urlStateToReplace: UrlInputsModel | KqlQuery | string,
    urlStateKey: string,
    latestLocation: Location = {
      hash: '',
      pathname: pathName,
      search,
      state: '',
    }
  ) => {
    const newLocation = replaceQueryStringInLocation(
      {
        hash: '',
        pathname: pathName,
        search,
        state: '',
      },
      replaceStateKeyInQueryString(urlStateKey, urlStateToReplace)(
        getQueryStringFromLocation(latestLocation)
      )
    );

    if (history && !isEqual(newLocation.search, latestLocation.search)) {
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
          !isKqlForRoute(pageName, detailName, kqlQueryStateData.queryLocation) &&
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

      const timelineId: InputsModelId = 'timeline';
      const timelineLinkTo: LinkTo = { linkTo: get('timeline.linkTo', timerangeStateData) };
      const timelineType: TimeRangeKinds = get('timeline.timerange.kind', timerangeStateData);

      if (isEmpty(globalLinkTo.linkTo)) {
        dispatch(removeGlobalLinkTo());
      } else {
        dispatch(addGlobalLinkTo({ linkToId: 'timeline' }));
      }

      if (isEmpty(timelineLinkTo.linkTo)) {
        dispatch(removeTimelineLinkTo());
      } else {
        dispatch(addTimelineLinkTo({ linkToId: 'global' }));
      }

      if (timelineType) {
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

      if (globalType) {
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
    }
    if (urlKey === CONSTANTS.kqlQuery && indexPattern != null) {
      const kqlQueryStateData: KqlQuery = decodeRisonUrlState(newUrlStateString);
      if (isKqlForRoute(pageName, detailName, kqlQueryStateData.queryLocation)) {
        const filterQuery = {
          kuery: kqlQueryStateData.filterQuery,
          serializedQuery: convertKueryToElasticSearchQuery(
            kqlQueryStateData.filterQuery ? kqlQueryStateData.filterQuery.expression : '',
            indexPattern
          ),
        };
        const page = getCurrentLocation(pageName, detailName);
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
    const type: UrlStateType = getUrlType(pageName);
    const location: Location = {
      hash: '',
      pathname: pathName,
      search,
      state: '',
    };

    if (isInitializing && pageName != null && pageName !== '') {
      handleInitialize(location, type);
      setIsInitializing(false);
    } else if (!isEqual(urlState, prevProps.urlState)) {
      let newLocation: Location = location;
      URL_STATE_KEYS[type].forEach((urlKey: KeyUrlState) => {
        newLocation = replaceStateInLocation(urlState[urlKey], urlKey, newLocation);
      });
    } else if (pathName !== prevProps.pathName) {
      handleInitialize(location, type);
    }
  });

  useEffect(() => {
    document.title = `${getTitle(pageName, detailName, navTabs)} - Kibana`;
  }, [pageName]);

  return null;
};
