/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { encode, decode } from '@kbn/rison';
import type { LocationDescriptorObject } from 'history';
import { Filter } from '@kbn/es-query';
import { SECURITY_DEFAULT_DATA_VIEW_ID } from '@kbn/cloud-security-posture-common';
import { CspClientPluginStartDeps } from '../types';
import { createFilter, NavFilter } from '../hooks/use_navigate_findings';

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
  services: Partial<CoreStart> & CoreStart & CspClientPluginStartDeps,
  filters: Filter[],
  groupBy?: string[]
): any => {
  return encodeQuery({
    query: services.data.query.queryString.getDefaultQuery(),
    filters,
    ...(groupBy && { groupBy }),
  });
};

export const queryFilters = (
  filterParams: NavFilter = {},
  dataViewId = SECURITY_DEFAULT_DATA_VIEW_ID
): Filter[] => {
  return Object.entries(filterParams).map(([key, filterValue]) =>
    createFilter(key, filterValue, dataViewId)
  );
};
