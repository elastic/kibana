/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import qs from 'querystring';
import { UptimeUrlParams, getSupportedUrlParams } from '../lib/helper';

interface Location {
  pathname: string;
  search: string;
}

export const useUrlParams = (
  history: any,
  location: Location
): [UptimeUrlParams, (updatedParams: any) => string] => {
  const { pathname, search } = location;
  const currentParams: any = qs.parse(search[0] === '?' ? search.slice(1) : search);

  const updateUrl = (updatedParams: any) => {
    const updatedSearch = qs.stringify({ ...currentParams, ...updatedParams });
    history.push({
      pathname,
      search: updatedSearch,
    });

    return `${pathname}?${updatedSearch}`;
  };

  return [getSupportedUrlParams(currentParams), updateUrl];
};
