/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const MONITOR_ROUTE = '/monitor/:monitorId?';

export const OVERVIEW_ROUTE = '/';

export enum STATUS {
  UP = 'up',
  DOWN = 'down',
}

export const UNNAMED_LOCATION = 'Unnamed-location';

export const SHORT_TS_LOCALE = 'en-short-locale';

export const SHORT_TIMESPAN_LOCALE = {
  relativeTime: {
    future: 'in %s',
    past: '%s ago',
    s: '%ds',
    ss: '%ss',
    m: '%dm',
    mm: '%dm',
    h: '%dh',
    hh: '%dh',
    d: '%dd',
    dd: '%dd',
    M: '%d Mon',
    MM: '%d Mon',
    y: '%d Yr',
    yy: '%d Yr',
  },
};
