/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';

import { isEmpty } from 'lodash/fp';
import { UrlInputsModel } from '../../store/inputs/model';
import { CONSTANTS } from '../url_state/constants';
import { UrlSateQuery, URL_STATE_KEYS, KeyUrlState, Timeline, KqlQuery } from '../url_state/types';
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
        let urlStateToReplace: UrlInputsModel | UrlSateQuery | Timeline | string = '';

        if (urlKey === CONSTANTS.kqlQuery) {
          const kqlQuery = urlState.kqlQuery as KqlQuery;
          if (
            kqlQuery.appQuery != null &&
            kqlQuery.appQuery.query === '' &&
            isEmpty(kqlQuery.filters)
          ) {
            urlStateToReplace = '';
          } else {
            urlStateToReplace = urlState.kqlQuery;
          }
        } else if (urlKey === CONSTANTS.timerange) {
          urlStateToReplace = urlState[CONSTANTS.timerange];
        } else if (urlKey === CONSTANTS.timeline) {
          const timeline = urlState[CONSTANTS.timeline];
          if (timeline.id === '') {
            urlStateToReplace = '';
          } else {
            urlStateToReplace = timeline;
          }
        }
        return replaceQueryStringInLocation(
          myLocation,
          replaceStateKeyInQueryString(urlKey, urlStateToReplace)(
            getQueryStringFromLocation(myLocation)
          )
        );
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
