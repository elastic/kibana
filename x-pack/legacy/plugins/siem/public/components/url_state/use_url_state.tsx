/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual, difference, isEmpty } from 'lodash/fp';
import { useEffect, useRef, useState } from 'react';
import { Query } from 'src/plugins/data/public';

import { useApolloClient } from '../../utils/apollo_context';
import { CONSTANTS, UrlStateType } from './constants';
import {
  getQueryStringFromLocation,
  getParamFromQueryString,
  getUrlType,
  getTitle,
  replaceStateInLocation,
  updateUrlStateString,
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

  const handleInitialize = (type: UrlStateType, needUpdate?: boolean) => {
    let mySearch = search;
    let urlStateToUpdate: UrlStateToRedux[] = [];
    URL_STATE_KEYS[type].forEach((urlKey: KeyUrlState) => {
      const newUrlStateString = getParamFromQueryString(
        getQueryStringFromLocation(mySearch),
        urlKey
      );
      if (newUrlStateString) {
        mySearch = updateUrlStateString({
          history,
          newUrlStateString,
          pathName,
          search: mySearch,
          urlKey,
        });
        if (isInitializing) {
          urlStateToUpdate = [
            ...urlStateToUpdate,
            {
              urlKey,
              newUrlStateString,
            },
          ];
        } else if (needUpdate) {
          const updatedUrlStateString =
            getParamFromQueryString(getQueryStringFromLocation(mySearch), urlKey) ??
            newUrlStateString;
          if (!isEqual(updatedUrlStateString, newUrlStateString)) {
            urlStateToUpdate = [
              ...urlStateToUpdate,
              {
                urlKey,
                newUrlStateString: updatedUrlStateString,
              },
            ];
          }
        }
      } else if (
        urlKey === CONSTANTS.appQuery &&
        urlState[urlKey] != null &&
        (urlState[urlKey] as Query).query === ''
      ) {
        mySearch = replaceStateInLocation({
          history,
          pathName,
          search: mySearch,
          urlStateToReplace: '',
          urlStateKey: urlKey,
        });
      } else if (urlKey === CONSTANTS.filters && isEmpty(urlState[urlKey])) {
        mySearch = replaceStateInLocation({
          history,
          pathName,
          search: mySearch,
          urlStateToReplace: '',
          urlStateKey: urlKey,
        });
      } else if (
        urlKey === CONSTANTS.timeline &&
        urlState[urlKey] != null &&
        (urlState[urlKey] as Timeline).id === ''
      ) {
        mySearch = replaceStateInLocation({
          history,
          pathName,
          search: mySearch,
          urlStateToReplace: '',
          urlStateKey: urlKey,
        });
      } else {
        mySearch = replaceStateInLocation({
          history,
          pathName,
          search: mySearch,
          urlStateToReplace: urlState[urlKey] || '',
          urlStateKey: urlKey,
        });
      }
    });
    difference(ALL_URL_STATE_KEYS, URL_STATE_KEYS[type]).forEach((urlKey: KeyUrlState) => {
      mySearch = replaceStateInLocation({
        history,
        pathName,
        search: mySearch,
        urlStateToReplace: '',
        urlStateKey: urlKey,
      });
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
    if (isInitializing && pageName != null && pageName !== '') {
      handleInitialize(type);
      setIsInitializing(false);
    } else if (!isEqual(urlState, prevProps.urlState) && !isInitializing) {
      let mySearch = search;
      URL_STATE_KEYS[type].forEach((urlKey: KeyUrlState) => {
        if (
          urlKey === CONSTANTS.appQuery &&
          urlState[urlKey] != null &&
          (urlState[urlKey] as Query).query === ''
        ) {
          mySearch = replaceStateInLocation({
            history,
            pathName,
            search: mySearch,
            urlStateToReplace: '',
            urlStateKey: urlKey,
          });
        } else if (urlKey === CONSTANTS.filters && isEmpty(urlState[urlKey])) {
          mySearch = replaceStateInLocation({
            history,
            pathName,
            search: mySearch,
            urlStateToReplace: '',
            urlStateKey: urlKey,
          });
        } else if (
          urlKey === CONSTANTS.timeline &&
          urlState[urlKey] != null &&
          (urlState[urlKey] as Timeline).id === ''
        ) {
          mySearch = replaceStateInLocation({
            history,
            pathName,
            search: mySearch,
            urlStateToReplace: '',
            urlStateKey: urlKey,
          });
        } else {
          mySearch = replaceStateInLocation({
            history,
            pathName,
            search: mySearch,
            urlStateToReplace: urlState[urlKey] || '',
            urlStateKey: urlKey,
          });
        }
      });
    } else if (pathName !== prevProps.pathName) {
      handleInitialize(type, true);
    }
  }, [isInitializing, pathName, pageName, prevProps, urlState]);

  useEffect(() => {
    document.title = `${getTitle(pageName, detailName, navTabs)} - Kibana`;
  }, [pageName]);

  return null;
};
