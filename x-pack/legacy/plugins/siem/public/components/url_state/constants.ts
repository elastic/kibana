/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum CONSTANTS {
  appQuery = 'query',
  filters = 'filters',
  savedQuery = 'savedQuery',
  hostsDetails = 'hosts.details',
  hostsPage = 'hosts.page',
  networkDetails = 'network.details',
  networkPage = 'network.page',
  overviewPage = 'overview.page',
  timelinePage = 'timeline.page',
  timerange = 'timerange',
  timeline = 'timeline',
  unknown = 'unknown',
}

export type UrlStateType = 'host' | 'network' | 'overview' | 'timeline';
