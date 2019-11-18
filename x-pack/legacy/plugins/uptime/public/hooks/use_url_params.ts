/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import qs from 'querystring';
import { useContext } from 'react';
import { UptimeRefreshContext } from '../contexts';
import { UptimeUrlParams, getSupportedUrlParams } from '../lib/helper';

type GetUrlParams = () => UptimeUrlParams;
type UpdateUrlParams = (updatedParams: { [key: string]: string | number | boolean }) => void;

export type UptimeUrlParamsHook = () => [GetUrlParams, UpdateUrlParams];

export const useUrlParams: UptimeUrlParamsHook = () => {
  const refreshContext = useContext(UptimeRefreshContext);

  const getUrlParams: GetUrlParams = () => {
    let search: string | undefined;
    if (refreshContext.location) {
      search = refreshContext.location.search;
    }

    const params = search ? { ...qs.parse(search[0] === '?' ? search.slice(1) : search) } : {};
    return getSupportedUrlParams(params);
  };

  const updateUrlParams: UpdateUrlParams = updatedParams => {
    if (!refreshContext.history || !refreshContext.location) return;
    const {
      history,
      location: { pathname, search },
    } = refreshContext;
    const currentParams: any = qs.parse(search[0] === '?' ? search.slice(1) : search);
    const mergedParams = {
      ...currentParams,
      ...updatedParams,
    };

    history.push({
      pathname,
      search: qs.stringify(
        // drop any parameters that have no value
        Object.keys(mergedParams).reduce((params, key) => {
          const value = mergedParams[key];
          if (value === undefined || value === '') {
            return params;
          }
          return {
            ...params,
            [key]: value,
          };
        }, {})
      ),
    });
  };

  return [getUrlParams, updateUrlParams];
};
