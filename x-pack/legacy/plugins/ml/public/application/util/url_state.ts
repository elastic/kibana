/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse, stringify } from 'query-string';
import { useCallback } from 'react';
import { isEqual } from 'lodash';
import { decode, encode } from 'rison-node';
import { useHistory, useLocation } from 'react-router-dom';

import { Dictionary } from '../../../common/types/common';

import { getNestedProperty } from './object_utils';

export type SetUrlState = (attribute: string | Dictionary<any>, value?: any) => void;
export type UrlState = [Dictionary<any>, SetUrlState];

/**
 * Set of URL query parameters that require the rison serialization.
 */
const risonSerializedParams = new Set(['_a', '_g']);

/**
 * Checks if the URL query parameter requires rison serialization.
 * @param queryParam
 */
function isRisonSerializationRequired(queryParam: string): boolean {
  return risonSerializedParams.has(queryParam);
}

export function getUrlState(search: string): Dictionary<any> {
  const urlState: Dictionary<any> = {};
  const parsedQueryString = parse(search, { sort: false });

  try {
    Object.keys(parsedQueryString).forEach(a => {
      if (isRisonSerializationRequired(a)) {
        urlState[a] = decode(parsedQueryString[a] as string);
      } else {
        urlState[a] = parsedQueryString[a];
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Could not read url state', error);
  }

  return urlState;
}

// Compared to the original appState/globalState,
// this no longer makes use of fetch/save methods.
// - Reading from `location.search` is the successor of `fetch`.
// - `history.push()` is the successor of `save`.
// - The exposed state and set call make use of the above and make sure that
//   different urlStates(e.g. `_a` / `_g`) don't overwrite each other.
export const useUrlState = (accessor: string): UrlState => {
  const history = useHistory();
  const { search } = useLocation();

  const setUrlState = useCallback(
    (attribute: string | Dictionary<any>, value?: any) => {
      const urlState = getUrlState(search);
      const parsedQueryString = parse(search, { sort: false });

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

      try {
        const oldLocationSearch = stringify(parsedQueryString, { sort: false, encode: false });

        Object.keys(urlState).forEach(a => {
          if (isRisonSerializationRequired(a)) {
            parsedQueryString[a] = encode(urlState[a]);
          } else {
            parsedQueryString[a] = urlState[a];
          }
        });
        const newLocationSearch = stringify(parsedQueryString, { sort: false, encode: false });

        if (oldLocationSearch !== newLocationSearch) {
          history.push({
            search: stringify(parsedQueryString, { sort: false }),
          });
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Could not save url state', error);
      }
    },
    [search]
  );

  return [getUrlState(search)[accessor], setUrlState];
};
