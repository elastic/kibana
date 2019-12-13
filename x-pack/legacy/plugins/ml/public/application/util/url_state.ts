/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import queryString from 'query-string';
import { decode, encode } from 'rison-node';

import { useHistory, useLocation } from 'react-router-dom';

export const useUrlState = (accessor: string) => {
  const history = useHistory();
  const location = useLocation();

  let state: any = {};

  const fetch = () => {
    try {
      const parsedQueryString = queryString.parse(location.search);
      state = decode(parsedQueryString[accessor]);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Could not fetch url state');
    }
  };

  // initial fetch
  fetch();

  const get = (attribute: string) => {
    return state[attribute];
  };

  const set = (attribute: string, value: any) => {
    state[attribute] = value;
  };

  const on = () => {};
  const off = () => {};

  const save = () => {
    try {
      const parsedQueryString = queryString.parse(location.search);
      const oldLocationSearch = queryString.stringify(parsedQueryString, { encode: false });
      parsedQueryString[accessor] = encode(state);
      // location.search = queryString.stringify(parsedQueryString);
      const newLocationSearch = queryString.stringify(parsedQueryString, { encode: false });
      if (oldLocationSearch !== newLocationSearch) {
        setTimeout(() => {
          history.push({
            search: queryString.stringify(parsedQueryString),
          });
        }, 0);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Could not save url state', error);
    }
  };

  return {
    fetch,
    get,
    on,
    off,
    save,
    set,
  };
};
