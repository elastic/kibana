/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';
import * as i18n from '../translations';
import { IpDetailsTableType } from '../../../store/network/model';
import { KeyIPDetailsNavTab } from './types';
import { NavTab } from '../../../components/navigation/types';

const getTabsOnIpDetailsUrl = (ip: string, tabName: IpDetailsTableType) => {
  return `#/network/ip/${ip}/${tabName}`;
};

export const navTabsIPDetails = (
  ip: string,
  hasMlUserPermissions: boolean
): Record<KeyIPDetailsNavTab, NavTab> => {
  const ipDetailsNavTabs = {
    [IpDetailsTableType.tls]: {
      id: IpDetailsTableType.tls,
      name: i18n.NAVIGATION_TLS_TITLE,
      href: getTabsOnIpDetailsUrl(ip, IpDetailsTableType.tls),
      disabled: false,
      urlKey: 'network',
      isDetailPage: true,
    },
    [IpDetailsTableType.users]: {
      id: IpDetailsTableType.users,
      name: i18n.NAVIGATION_USERS_TITLE,
      href: getTabsOnIpDetailsUrl(ip, IpDetailsTableType.users),
      disabled: false,
      urlKey: 'network',
      isDetailPage: true,
    },
    [IpDetailsTableType.anomalies]: {
      id: IpDetailsTableType.anomalies,
      name: i18n.NAVIGATION_ANOMALIES_TITLE,
      href: getTabsOnIpDetailsUrl(ip, IpDetailsTableType.anomalies),
      disabled: false,
      urlKey: 'network',
      isDetailPage: true,
    },
  };

  return hasMlUserPermissions
    ? ipDetailsNavTabs
    : omit(IpDetailsTableType.anomalies, ipDetailsNavTabs);
};
