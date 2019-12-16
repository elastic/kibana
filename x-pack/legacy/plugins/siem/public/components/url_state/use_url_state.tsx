/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { isEqual, difference, isEmpty } from 'lodash/fp';
import { useEffect, useRef, useState } from 'react';
import { Query, esFilters } from 'src/plugins/data/public';
import { useApolloClient } from '@apollo/client';

import { UrlInputsModel } from '../../store/inputs/model';

import { CONSTANTS, UrlStateType } from './constants';
import {
  replaceQueryStringInLocation,
  getQueryStringFromLocation,
  replaceStateKeyInQueryString,
  getParamFromQueryString,
  decodeRisonUrlState,
  getUrlType,
  getTitle,
} from './helpers';
import {
  UrlStateContainerPropTypes,
  PreviousLocationUrlState,
  URL_STATE_KEYS,
  KeyUrlState,
  ALL_URL_STATE_KEYS,
  UrlStateToRedux,
  Timeline,
} from './types';

function usePrevious(value: PreviousLocationUrlState) {
  const ref = useRef<PreviousLocationUrlState>(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export const useUrlStateHooks = ({
  detailName,
  indexPattern,
  history,
  navTabs,
  pageName,
  pathName,
  search,
  setInitialStateFromUrl,
  tabName,
  updateTimeline,
  updateTimelineIsLoading,
  urlState,
}: UrlStateContainerPropTypes) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const apolloClient = useApolloClient();
  const prevProps = usePrevious({ pathName, urlState });

  const replaceStateInLocation = (
    urlStateToReplace: UrlInputsModel | Query | esFilters.Filter[] | Timeline | string,
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
      replaceStateKeyInQueryString(
        urlStateKey,
        urlStateToReplace
      )(getQueryStringFromLocation(latestLocation))
    );
    if (history) {
      history.replace(newLocation);
    }
    return newLocation;
  };

  const handleInitialize = (initLocation: Location, type: UrlStateType) => {
    let myLocation: Location = initLocation;
    let urlStateToUpdate: UrlStateToRedux[] = [];
    URL_STATE_KEYS[type].forEach((urlKey: KeyUrlState) => {
      const newUrlStateString = getParamFromQueryString(
        getQueryStringFromLocation(initLocation),
        urlKey
      );
      if (newUrlStateString) {
        const queryState: Query | Timeline | esFilters.Filter[] = decodeRisonUrlState(
          newUrlStateString
        );

        if (
          urlKey === CONSTANTS.appQuery &&
          queryState != null &&
          (queryState as Query).query === ''
        ) {
          myLocation = replaceStateInLocation('', urlKey, myLocation);
        } else if (urlKey === CONSTANTS.filters && isEmpty(queryState)) {
          myLocation = replaceStateInLocation('', urlKey, myLocation);
        } else if (
          urlKey === CONSTANTS.timeline &&
          queryState != null &&
          (queryState as Timeline).id === ''
        ) {
          myLocation = replaceStateInLocation('', urlKey, myLocation);
        }
        if (isInitializing) {
          urlStateToUpdate = [...urlStateToUpdate, { urlKey, newUrlStateString }];
        }
      } else if (
        urlKey === CONSTANTS.appQuery &&
        urlState[urlKey] != null &&
        (urlState[urlKey] as Query).query === ''
      ) {
        myLocation = replaceStateInLocation('', urlKey, myLocation);
      } else if (urlKey === CONSTANTS.filters && isEmpty(urlState[urlKey])) {
        myLocation = replaceStateInLocation('', urlKey, myLocation);
      } else if (
        urlKey === CONSTANTS.timeline &&
        urlState[urlKey] != null &&
        (urlState[urlKey] as Timeline).id === ''
      ) {
        myLocation = replaceStateInLocation('', urlKey, myLocation);
      } else {
        myLocation = replaceStateInLocation(urlState[urlKey] || '', urlKey, myLocation);
      }
    });
    difference(ALL_URL_STATE_KEYS, URL_STATE_KEYS[type]).forEach((urlKey: KeyUrlState) => {
      myLocation = replaceStateInLocation('', urlKey, myLocation);
    });

    setInitialStateFromUrl({
      apolloClient,
      detailName,
      indexPattern,
      pageName,
      updateTimeline,
      updateTimelineIsLoading,
      urlStateToUpdate,
    })();
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
    } else if (!isEqual(urlState, prevProps.urlState) && !isInitializing) {
      let newLocation: Location = location;
      URL_STATE_KEYS[type].forEach((urlKey: KeyUrlState) => {
        if (
          urlKey === CONSTANTS.appQuery &&
          urlState[urlKey] != null &&
          (urlState[urlKey] as Query).query === ''
        ) {
          newLocation = replaceStateInLocation('', urlKey, newLocation);
        } else if (urlKey === CONSTANTS.filters && isEmpty(urlState[urlKey])) {
          newLocation = replaceStateInLocation('', urlKey, newLocation);
        } else if (
          urlKey === CONSTANTS.timeline &&
          urlState[urlKey] != null &&
          (urlState[urlKey] as Timeline).id === ''
        ) {
          newLocation = replaceStateInLocation('', urlKey, newLocation);
        } else {
          newLocation = replaceStateInLocation(urlState[urlKey] || '', urlKey, newLocation);
        }
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
