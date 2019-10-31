/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import qs from 'querystring';
import { LocalUIFilterName } from '../../../../server/lib/ui_filters/local_ui_filters/config';

export function toQuery(search?: string): APMQueryParamsRaw {
  return search ? qs.parse(search.slice(1)) : {};
}

export function fromQuery(query: Record<string, any>) {
  return qs.stringify(query, undefined, undefined, {
    encodeURIComponent: (value: string) => {
      return encodeURIComponent(value).replace(/%3A/g, ':');
    }
  });
}

export type APMQueryParams = {
  transactionId?: string;
  transactionName?: string;
  transactionType?: string;
  traceId?: string;
  detailTab?: string;
  flyoutDetailTab?: string;
  waterfallItemId?: string;
  spanId?: string;
  page?: string | number;
  pageSize?: string;
  sortDirection?: string;
  sortField?: string;
  kuery?: string;
  environment?: string;
  rangeFrom?: string;
  rangeTo?: string;
  refreshPaused?: string | boolean;
  refreshInterval?: string | number;
  searchTerm?: string;
} & { [key in LocalUIFilterName]?: string };

// forces every value of T[K] to be type: string
type StringifyAll<T> = { [K in keyof T]: string };
type APMQueryParamsRaw = StringifyAll<APMQueryParams>;
