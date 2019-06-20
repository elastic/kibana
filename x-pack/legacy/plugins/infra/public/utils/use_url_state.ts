/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { useMemo, useCallback } from 'react';
import { decode, encode, RisonValue } from 'rison-node';

import { QueryString } from 'ui/utils/query_string';
import { useHistory } from './history_context';

export const useUrlState = <State>({
  defaultState,
  decodeUrlState,
  encodeUrlState,
  urlStateKey,
}: {
  defaultState: State;
  decodeUrlState: (value: RisonValue | undefined) => State | undefined;
  encodeUrlState: (value: State) => RisonValue | undefined;
  urlStateKey: string;
}) => {
  const history = useHistory();

  const urlStateString = useMemo(
    () => {
      if (!history) {
        return;
      }

      return getParamFromQueryString(getQueryStringFromLocation(history.location), urlStateKey);
    },
    [history && history.location, urlStateKey]
  );

  const decodedState = useMemo(() => decodeUrlState(decodeRisonUrlState(urlStateString)), [
    decodeUrlState,
    urlStateString,
  ]);

  const state = useMemo(() => (typeof decodedState !== 'undefined' ? decodedState : defaultState), [
    defaultState,
    decodedState,
  ]);

  const setState = useCallback(
    (newState: State | undefined) => {
      if (!history) {
        return;
      }

      const location = history.location;

      const newLocation = replaceQueryStringInLocation(
        location,
        replaceStateKeyInQueryString(
          urlStateKey,
          typeof newState !== 'undefined' ? encodeUrlState(newState) : undefined
        )(getQueryStringFromLocation(location))
      );

      if (newLocation !== location) {
        history.replace(newLocation);
      }
    },
    [encodeUrlState, history, history && history.location, urlStateKey]
  );

  return [state, setState] as [typeof state, typeof setState];
};

const decodeRisonUrlState = (value: string | undefined): RisonValue | undefined => {
  try {
    return value ? decode(value) : undefined;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('rison decoder error')) {
      return {};
    }
    throw error;
  }
};

const encodeRisonUrlState = (state: any) => encode(state);

const getQueryStringFromLocation = (location: Location) => location.search.substring(1);

const getParamFromQueryString = (queryString: string, key: string): string | undefined => {
  const queryParam = QueryString.decode(queryString)[key];
  return Array.isArray(queryParam) ? queryParam[0] : queryParam;
};

export const replaceStateKeyInQueryString = <UrlState extends any>(
  stateKey: string,
  urlState: UrlState | undefined
) => (queryString: string) => {
  const previousQueryValues = QueryString.decode(queryString);
  const encodedUrlState =
    typeof urlState !== 'undefined' ? encodeRisonUrlState(urlState) : undefined;
  return QueryString.encode({
    ...previousQueryValues,
    [stateKey]: encodedUrlState,
  });
};

const replaceQueryStringInLocation = (location: Location, queryString: string): Location => {
  if (queryString === getQueryStringFromLocation(location)) {
    return location;
  } else {
    return {
      ...location,
      search: `?${queryString}`,
    };
  }
};
