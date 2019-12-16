/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import queryString from 'query-string';
import { decode, encode } from 'rison-node';
import { useHistory, useLocation } from 'react-router-dom';

import { Dictionary } from '../../../common/types/common';

export interface UrlState {
  fetch: () => void;
  get: (attribute: string) => any;
  save: () => void;
  set: (attribute: string, value: any) => void;
}

export const useUrlState = (accessor: string): UrlState => {
  const history = useHistory();
  const location = useLocation();

  let urlState: Dictionary<any> = {};

  const fetch = () => {
    try {
      const parsedQueryString = queryString.parse(location.search);
      urlState = decode(parsedQueryString[accessor]) as Dictionary<any>;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Could not fetch url state');
    }
  };

  fetch();

  const get = (attribute: string) => {
    return urlState[attribute];
  };

  const set = (attribute: string, value: any) => {
    urlState[attribute] = value;
  };

  const save = () => {
    try {
      const parsedQueryString = queryString.parse(location.search);
      const oldLocationSearch = queryString.stringify(parsedQueryString, { encode: false });
      parsedQueryString[accessor] = encode(urlState);
      const newLocationSearch = queryString.stringify(parsedQueryString, { encode: false });
      if (oldLocationSearch !== newLocationSearch) {
        history.push({
          search: queryString.stringify(parsedQueryString),
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Could not save url state', error);
    }
  };

  return {
    fetch,
    get,
    save,
    set,
  };
};
