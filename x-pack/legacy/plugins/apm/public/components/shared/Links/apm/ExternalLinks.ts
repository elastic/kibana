/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import url from 'url';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';

export type QueryParams = Required<Pick<IUrlParams, 'rangeFrom' | 'rangeTo'>>;

export const getTraceUrl = (
  traceId: number | string,
  queryParams?: QueryParams
) => {
  const { rangeFrom, rangeTo } = queryParams || {};
  return url.format({
    pathname: `/link-to/trace/${traceId}`,
    query: rangeFrom && rangeTo ? { rangeFrom, rangeTo } : {}
  });
};
