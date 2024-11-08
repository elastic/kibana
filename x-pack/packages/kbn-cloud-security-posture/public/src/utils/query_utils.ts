/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode, decode } from '@kbn/rison';
import type { LocationDescriptorObject } from 'history';
import { Filter } from '@kbn/es-query';
import { SECURITY_DEFAULT_DATA_VIEW_ID } from '@kbn/cloud-security-posture-common';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';

interface NegatedValue {
  value: string | number;
  negate: boolean;
}

type FilterValue = string | number | NegatedValue;

export type NavFilter = Record<string, FilterValue>;

const encodeRison = (v: any): string | undefined => {
  try {
    return encode(v);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
};

const decodeRison = <T extends unknown>(query: string): T | undefined => {
  try {
    return decode(query) as T;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
};

const QUERY_PARAM_KEY = 'cspq';

export const encodeQuery = (query: any): LocationDescriptorObject['search'] => {
  const risonQuery = encodeRison(query);
  if (!risonQuery) return;
  return `${QUERY_PARAM_KEY}=${risonQuery}`;
};

export const decodeQuery = <T extends unknown>(search?: string): Partial<T> | undefined => {
  const risonQuery = new URLSearchParams(search).get(QUERY_PARAM_KEY);
  if (!risonQuery) return;
  return decodeRison<T>(risonQuery);
};

export const encodeQueryUrl = (
  servicesStart: DataPublicPluginStart,
  filters: Filter[],
  groupBy?: string[]
): any => {
  return encodeQuery({
    query: servicesStart.query.queryString.getDefaultQuery(),
    filters,
    ...(groupBy && { groupBy }),
  });
};

// dataViewId is used to prevent FilterManager from falling back to the default in the sorcerer (logs-*)
export const composeQueryFilters = (
  filterParams: NavFilter = {},
  dataViewId = SECURITY_DEFAULT_DATA_VIEW_ID
): Filter[] => {
  return Object.entries(filterParams).map(([key, filterValue]) =>
    createFilter(key, filterValue, dataViewId)
  );
};

export const createFilter = (key: string, filterValue: FilterValue, dataViewId: string): Filter => {
  let negate = false;
  let value = filterValue;
  if (typeof filterValue === 'object') {
    negate = filterValue.negate;
    value = filterValue.value;
  }
  // If the value is '*', we want to create an exists filter
  if (value === '*') {
    return {
      query: { exists: { field: key } },
      meta: { type: 'exists', index: dataViewId },
    };
  }
  return {
    meta: {
      alias: null,
      negate,
      disabled: false,
      type: 'phrase',
      key,
      index: dataViewId,
    },
    query: { match_phrase: { [key]: value } },
  };
};
