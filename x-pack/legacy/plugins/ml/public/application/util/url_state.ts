/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback } from 'react';
import { isEqual } from 'lodash';
// @ts-ignore
import queryString from 'query-string';
import { decode, encode } from 'rison-node';
import { useHistory, useLocation } from 'react-router-dom';

import { Dictionary } from '../../../common/types/common';

import { getNestedProperty } from './object_utils';

export type SetUrlState = (attribute: string | Dictionary<any>, value?: any) => void;
export type UrlState = [Dictionary<any>, SetUrlState];

// Compared to the original appState/globalState,
// this no longer makes use of fetch/save methods.
// - Reading from `location.search` is the successor of `fetch`.
// - `history.push()` is the successor of `save`.
// - The exposed state and set call make use of the above and make sure that
//   different urlStates(e.g. `_a` / `_g`) don't overwrite each other.

export const useUrlState = (accessor: string): UrlState => {
  const history = useHistory();
  const { search } = useLocation();

  const urlState: Dictionary<any> = {};
  const parsedQueryString = queryString.parse(search);

  try {
    Object.keys(parsedQueryString).forEach(a => {
      urlState[a] = decode(parsedQueryString[a]) as Dictionary<any>;
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Could not read url state', accessor, error);
  }

  const persistStateToUrl = useCallback(
    (newUrlState: Dictionary<any>) => {
      try {
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
    },
    [parsedQueryString]
  );

  const setUrlState = useCallback(
    (attribute: string | Dictionary<any>, value?: any) => {
      if (!Object.prototype.hasOwnProperty.call(urlState, accessor)) {
        urlState[accessor] = {};
      }

      if (typeof attribute === 'string') {
        if (isEqual(getNestedProperty(urlState, `${accessor}.${attribute}`), value)) {
          return;
        }

        urlState[accessor][attribute] = value;
      } else {
        const attributes = attribute;
        Object.keys(attributes).forEach(a => {
          urlState[accessor][a] = attributes[a];
        });
      }

      persistStateToUrl(urlState);
    },
    [JSON.stringify(urlState)]
  );

  return [urlState[accessor], setUrlState];
};
