/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import { useEffect } from 'react';
// @ts-ignore
import queryString from 'query-string';
import { decode, encode } from 'rison-node';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { useHistory, useLocation } from 'react-router-dom';

import { Dictionary } from '../../../common/types/common';

export interface UrlState {
  urlState$: Observable<Dictionary<any>>;
  fetch: () => void;
  get: (attribute: string) => any;
  save: () => void;
  set: (attribute: string, value: any) => void;
}

export const useUrlState = (accessor: string): UrlState => {
  const history = useHistory();
  const location = useLocation();

  let urlState: Dictionary<any> = {};
  const urlStateSubject$ = new BehaviorSubject(urlState);
  const urlState$ = urlStateSubject$.pipe(distinctUntilChanged(isEqual));

  const fetch = () => {
    try {
      const parsedQueryString = queryString.parse(location.search);
      urlState = decode(parsedQueryString[accessor]) as Dictionary<any>;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Could not fetch url state');
    }
  };

  useEffect(() => {
    fetch();
    urlStateSubject$.next(urlState);
  }, []);

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
      // location.search = queryString.stringify(parsedQueryString);
      const newLocationSearch = queryString.stringify(parsedQueryString, { encode: false });
      if (oldLocationSearch !== newLocationSearch) {
        history.push({
          search: queryString.stringify(parsedQueryString),
        });
        urlStateSubject$.next(urlState);
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
    urlState$,
  };
};
