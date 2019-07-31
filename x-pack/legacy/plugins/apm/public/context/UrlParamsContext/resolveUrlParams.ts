/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { pick } from 'lodash';
import { IUrlParams } from './types';
import {
  getPathParams,
  removeUndefinedProps,
  getStart,
  getEnd,
  toBoolean,
  toNumber,
  toString
} from './helpers';
import { toQuery } from '../../components/shared/Links/url_helpers';
import { TIMEPICKER_DEFAULTS } from './constants';
import {
  localUIFilterNames,
  LocalUIFilterName
} from '../../../server/lib/ui_filters/local_ui_filters/config';

type TimeUrlParams = Pick<
  IUrlParams,
  'start' | 'end' | 'rangeFrom' | 'rangeTo'
>;

export function resolveUrlParams(location: Location, state: TimeUrlParams) {
  const { processorEvent, serviceName, errorGroupId } = getPathParams(
    location.pathname
  );

  const query = toQuery(location.search);

  const {
    traceId,
    transactionId,
    transactionName,
    transactionType,
    detailTab,
    flyoutDetailTab,
    waterfallItemId,
    spanId,
    page,
    pageSize,
    sortDirection,
    sortField,
    kuery,
    refreshPaused = TIMEPICKER_DEFAULTS.refreshPaused,
    refreshInterval = TIMEPICKER_DEFAULTS.refreshInterval,
    rangeFrom = TIMEPICKER_DEFAULTS.rangeFrom,
    rangeTo = TIMEPICKER_DEFAULTS.rangeTo,
    environment
  } = query;

  const localUIFilters = pick(query, localUIFilterNames) as Partial<
    Pick<IUrlParams, LocalUIFilterName>
  >;

  return removeUndefinedProps({
    // date params
    start: getStart(state, rangeFrom),
    end: getEnd(state, rangeTo),
    rangeFrom,
    rangeTo,
    refreshPaused: toBoolean(refreshPaused),
    refreshInterval: toNumber(refreshInterval),

    // query params
    sortDirection,
    sortField,
    page: toNumber(page) || 0,
    pageSize: pageSize ? toNumber(pageSize) : undefined,
    transactionId: toString(transactionId),
    traceId: toString(traceId),
    waterfallItemId: toString(waterfallItemId),
    detailTab: toString(detailTab),
    flyoutDetailTab: toString(flyoutDetailTab),
    spanId: toNumber(spanId),
    kuery: kuery && decodeURIComponent(kuery),
    transactionName,
    transactionType,

    // path params
    processorEvent,
    serviceName,
    errorGroupId,

    // ui filters
    environment,
    ...localUIFilters
  });
}
