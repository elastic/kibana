/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';
import * as i18n from '../translations';
import { NetworkNavTab, NetworkRouteType } from './types';

const getTabsOnNetworkUrl = (tabName: NetworkRouteType) => `#/network/${tabName}`;

export const navTabsNetwork = (hasMlUserPermissions: boolean): NetworkNavTab => {
  const networkNavTabs = {
    [NetworkRouteType.flows]: {
      id: NetworkRouteType.flows,
      name: i18n.NAVIGATION_FLOWS_TITLE,
      href: getTabsOnNetworkUrl(NetworkRouteType.flows),
      disabled: false,
      urlKey: 'network',
    },
    [NetworkRouteType.dns]: {
      id: NetworkRouteType.dns,
      name: i18n.NAVIGATION_DNS_TITLE,
      href: getTabsOnNetworkUrl(NetworkRouteType.dns),
      disabled: false,
      urlKey: 'network',
    },
    [NetworkRouteType.http]: {
      id: NetworkRouteType.http,
      name: i18n.NAVIGATION_HTTP_TITLE,
      href: getTabsOnNetworkUrl(NetworkRouteType.http),
      disabled: false,
      urlKey: 'network',
    },
    [NetworkRouteType.tls]: {
      id: NetworkRouteType.tls,
      name: i18n.NAVIGATION_TLS_TITLE,
      href: getTabsOnNetworkUrl(NetworkRouteType.tls),
      disabled: false,
      urlKey: 'network',
    },
    [NetworkRouteType.anomalies]: {
      id: NetworkRouteType.anomalies,
      name: i18n.NAVIGATION_ANOMALIES_TITLE,
      href: getTabsOnNetworkUrl(NetworkRouteType.anomalies),
      disabled: false,
      urlKey: 'network',
    },
  };

  return hasMlUserPermissions ? networkNavTabs : omit([NetworkRouteType.anomalies], networkNavTabs);
};
