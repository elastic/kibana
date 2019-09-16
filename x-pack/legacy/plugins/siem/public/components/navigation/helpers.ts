/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';

import { UrlInputsModel } from '../../store/inputs/model';
import { CONSTANTS } from '../url_state/constants';
import { KqlQuery, URL_STATE_KEYS, KeyUrlState } from '../url_state/types';
import {
  replaceQueryStringInLocation,
  replaceStateKeyInQueryString,
  getQueryStringFromLocation,
} from '../url_state/helpers';

import { TabNavigationProps } from './tab_navigation/types';
import { SearchNavTab } from './types';

export const getSearch = (tab: SearchNavTab, urlState: TabNavigationProps): string => {
  if (tab && tab.urlKey != null && URL_STATE_KEYS[tab.urlKey] != null) {
    return URL_STATE_KEYS[tab.urlKey].reduce<Location>(
      (myLocation: Location, urlKey: KeyUrlState) => {
        let urlStateToReplace: UrlInputsModel | KqlQuery | string = urlState[CONSTANTS.timelineId];
        if (urlKey === CONSTANTS.kqlQuery && tab.urlKey === 'host') {
          urlStateToReplace = tab.isDetailPage ? urlState.hostDetails : urlState.hosts;
        } else if (urlKey === CONSTANTS.kqlQuery && tab.urlKey === 'network') {
          urlStateToReplace = urlState.network;
        } else if (urlKey === CONSTANTS.timerange) {
          urlStateToReplace = urlState[CONSTANTS.timerange];
        }
        myLocation = replaceQueryStringInLocation(
          myLocation,
          replaceStateKeyInQueryString(urlKey, urlStateToReplace)(
            getQueryStringFromLocation(myLocation)
          )
        );
        return myLocation;
      },
      {
        pathname: urlState.pathName,
        hash: '',
        search: '',
        state: '',
      }
    ).search;
  }
  return '';
};
