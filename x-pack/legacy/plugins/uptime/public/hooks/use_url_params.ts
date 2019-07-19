/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import qs from 'querystring';
import { useState } from 'react';
import { RouteComponentProps } from 'react-router';
import { History } from 'history';
import { UptimeUrlParams, getSupportedUrlParams } from '../lib/helper';

interface Location {
  pathname: string;
  search: string;
}

type GetUrlParams = () => UptimeUrlParams;
type UpdateUrlParams = (updatedParams: { [key: string]: string | number | boolean }) => void;
type SetRouter = (routerProps: RouteComponentProps) => void;

export function useUrlParams(): [GetUrlParams, UpdateUrlParams, SetRouter] {
  const [locationState, setLocation] = useState<Location | undefined>(undefined);
  const [historyState, setHistory] = useState<History | undefined>(undefined);
  const [urlParams, setUrlParams] = useState<{ [key: string]: string } | undefined>(undefined);

  const getUrlParams: GetUrlParams = () => {
    let currentParams = {};
    if (locationState) {
      const { search } = locationState;
      currentParams = qs.parse(search[0] === '?' ? search.slice(1) : search);
    }
    return getSupportedUrlParams(currentParams);
  };

  const updateUrlParams: UpdateUrlParams = updatedParams => {
    if (locationState && historyState) {
      const { pathname } = locationState;
      const updatedSearch = {
        ...urlParams,
        ...updatedParams,
      };
      setUrlParams(updatedSearch);
      historyState.push({
        pathname,
        search: qs.stringify(updatedSearch),
      });
    }
  };

  const setRouter: SetRouter = ({ history, location }) => {
    setHistory(history);
    setLocation(location);
  };

  return [getUrlParams, updateUrlParams, setRouter];
}
