/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useLocation, useHistory } from 'react-router-dom';
import { UptimeUrlParams, getSupportedUrlParams } from '../lib/helper';
import { url } from '../../../../../../src/plugins/kibana_utils/public';

type GetUrlParams = () => UptimeUrlParams;
type UpdateUrlParams = (updatedParams: { [key: string]: string | number | boolean }) => void;

export type UptimeUrlParamsHook = () => [GetUrlParams, UpdateUrlParams];

export const useUrlParams: UptimeUrlParamsHook = () => {
  const location = useLocation();
  const history = useHistory();

  const getUrlParams: GetUrlParams = () => {
    let search: string | undefined;
    if (location) {
      search = location.search;
    }

    const params = search
      ? {
          ...url.parseUrlQuery(search[0] === '?' ? search.slice(1) : search),
        }
      : {};
    return getSupportedUrlParams(params);
  };

  const updateUrlParams: UpdateUrlParams = updatedParams => {
    if (!history || !location) return;
    const { pathname, search } = location;
    const currentParams = url.parseUrlQuery(search[0] === '?' ? search.slice(1) : search);
    const mergedParams = {
      ...currentParams,
      ...updatedParams,
    };

    history.push({
      pathname,
      search: url.stringifyUrlQuery(
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
