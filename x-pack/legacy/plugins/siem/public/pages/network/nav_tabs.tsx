/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';
import * as i18n from './translations';
import { NetworkNavTab, NetworkTabType } from './types';

const getTabsOnNetworkUrl = (tabName: NetworkTabType) => `#/network/${tabName}`;

export const navTabsNetwork = (hasMlUserPermissions: boolean): NetworkNavTab => {
  const networkNavTabs = {
    [NetworkTabType.dns]: {
      id: NetworkTabType.dns,
      name: i18n.NAVIGATION_DNS_TITLE,
      href: getTabsOnNetworkUrl(NetworkTabType.dns),
      disabled: false,
      urlKey: 'network',
    },
    [NetworkTabType.ips]: {
      id: NetworkTabType.ips,
      name: i18n.NAVIGATION_IPS_TITLE,
      href: getTabsOnNetworkUrl(NetworkTabType.ips),
      disabled: false,
      urlKey: 'network',
    },
    [NetworkTabType.anomalies]: {
      id: NetworkTabType.anomalies,
      name: i18n.NAVIGATION_ANOMALIES_TITLE,
      href: getTabsOnNetworkUrl(NetworkTabType.anomalies),
      disabled: false,
      urlKey: 'network',
    },
  };

  return hasMlUserPermissions ? networkNavTabs : omit([NetworkTabType.anomalies], networkNavTabs);
};
