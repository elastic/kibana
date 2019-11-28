/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** The SIEM app's Hosts page */
export const HOSTS_PAGE = '/app/siem#/hosts/allHosts';
export const HOSTS_PAGE_TAB_URLS = {
  allHosts: '/app/siem#/hosts/allHosts',
  anomalies: '/app/siem#/hosts/anomalies',
  authentications: '/app/siem#/hosts/authentications',
  events: '/app/siem#/hosts/events',
  uncommonProcesses: '/app/siem#/hosts/uncommonProcesses',
};

/** Kibana's login page */
export const LOGIN_PAGE = '/login';

/** The SIEM app's Network page */
export const NETWORK_PAGE = '/app/siem#/network';
export const NETWORK_TAB_URLS = {
  dns: `${NETWORK_PAGE}/dns`,
};

/** The SIEM app's Overview page */
export const OVERVIEW_PAGE = '/app/siem#/overview';

/** The SIEM app's Timelines page */
export const TIMELINES_PAGE = '/app/siem#/timelines';

/** Visit this URL to logout of Kibana */
export const LOGOUT = '/logout';
