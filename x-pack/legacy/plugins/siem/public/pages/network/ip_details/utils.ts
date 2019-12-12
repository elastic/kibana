/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Breadcrumb } from 'ui/chrome';

import { decodeIpv6 } from '../../../lib/helpers';
import { getNetworkUrl, getIPDetailsUrl } from '../../../components/link_to/redirect_to_network';
import { networkModel } from '../../../store/network';
import * as i18n from '../translations';
import { NetworkRouteType } from '../navigation/types';
import { NetworkRouteSpyState } from '../../../utils/route/types';

export const type = networkModel.NetworkType.details;
const TabNameMappedToI18nKey: Record<NetworkRouteType, string> = {
  [NetworkRouteType.alerts]: i18n.NAVIGATION_ALERTS_TITLE,
  [NetworkRouteType.anomalies]: i18n.NAVIGATION_ANOMALIES_TITLE,
  [NetworkRouteType.flows]: i18n.NAVIGATION_FLOWS_TITLE,
  [NetworkRouteType.dns]: i18n.NAVIGATION_DNS_TITLE,
  [NetworkRouteType.http]: i18n.NAVIGATION_HTTP_TITLE,
  [NetworkRouteType.tls]: i18n.NAVIGATION_TLS_TITLE,
};

export const getBreadcrumbs = (params: NetworkRouteSpyState, search: string[]): Breadcrumb[] => {
  let breadcrumb = [
    {
      text: i18n.PAGE_TITLE,
      href: `${getNetworkUrl()}${search && search[0] ? search[0] : ''}`,
    },
  ];

  if (params.detailName != null) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: decodeIpv6(params.detailName),
        href: `${getIPDetailsUrl(params.detailName)}${search && search[1] ? search[1] : ''}`,
      },
    ];
  }
  if (params.tabName != null) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: TabNameMappedToI18nKey[params.tabName],
        href: '',
      },
    ];
  }
  return breadcrumb;
};
