/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { isEqual } from 'lodash';
// @ts-ignore
import queryString from 'query-string';
import { decode, encode } from 'rison-node';
import { useHistory } from 'react-router-dom';

import { Dictionary } from '../../../common/types/common';

import { getNestedProperty } from './object_utils';

export interface UrlState {
  get: (attribute: string) => any;
  set: (attribute: string | Dictionary<any>, value?: any) => void;
}

// Note on the use of `useHistory()`:
// Generally, it's recommended to use `useLocation()` instead of
// accessing `history.location.search`, because the latter is mutable.
// However, because the original appState/globalState were mutable
// themselves this code makes use of `history.location.search`.
// Using `useLocation()` as is here would fail because it would miss
// updates triggered by get/set outside react lifecycles.
// The aim of `useUrlState` is to restore the original behavior we had
// using appState/globalState without changing to much of the consuming code.
// In a future update we might consider using `useLocation()`.

// Compared to the original appState/globalState,
// this no longer makes use of fetch/save methods.
// - Reading from `history.location.search` is the successor of `fetch`.
// - `history.push()` is the successor of `save`.
// - The exposed `get/set()` calls make use of the above and make sure that
//   different urlStates(e.g. `_a` / `_g`) don't overwrite each other.

export const useUrlState = (accessor: string): UrlState => {
  const history = useHistory();

  const getStateFromUrl = () => {
    try {
      const parsedQueryString = queryString.parse(history.location.search);
      const newUrlState: Dictionary<any> = {};
      Object.keys(parsedQueryString).forEach(a => {
        newUrlState[a] = decode(parsedQueryString[a]) as Dictionary<any>;
      });
      return newUrlState;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Could not read url state', accessor, error);
      return {};
    }
  };

  const persistStateToUrl = (newUrlState: Dictionary<any>) => {
    try {
      const parsedQueryString = queryString.parse(history.location.search);
      const oldLocationSearch = queryString.stringify(parsedQueryString, { encode: false });

      Object.keys(newUrlState).forEach(a => {
        parsedQueryString[a] = encode(newUrlState[a]);
      });
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

  // check if the accessor is present, if not, initialize it with an empty object.
  useEffect(() => {
    const urlState = getStateFromUrl();
    if (!Object.prototype.hasOwnProperty.call(urlState, accessor)) {
      urlState[accessor] = {};
    }
    persistStateToUrl(urlState);
  }, []);

  const get = (attribute: string) => {
    return getNestedProperty(getStateFromUrl(), `${accessor}.${attribute}`);
  };

  const set = (attribute: string | Dictionary<any>, value?: any) => {
    const newUrlState = getStateFromUrl();

    if (!Object.prototype.hasOwnProperty.call(newUrlState, accessor)) {
      throw new Error(`useUrlState: set() failed, accessor '${accessor}' is not present.`);
    }

    if (typeof attribute === 'string') {
      if (isEqual(getNestedProperty(newUrlState, `${accessor}.${attribute}`), value)) {
        return;
      }

      newUrlState[accessor][attribute] = value;
    } else {
      const attributes = attribute;
      Object.keys(attributes).forEach(a => {
        newUrlState[accessor][a] = attributes[a];
      });
    }

    persistStateToUrl(newUrlState);
  };

  return {
    get,
    set,
  };
};
