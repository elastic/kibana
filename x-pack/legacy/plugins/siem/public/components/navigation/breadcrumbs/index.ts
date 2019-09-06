/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome, { Breadcrumb } from 'ui/chrome';

import { APP_NAME } from '../../../../common/constants';
import { getBreadcrumbs as getHostDetailsBreadcrumbs } from '../../../pages/hosts/host_details';
import { getBreadcrumbs as getIPDetailsBreadcrumbs } from '../../../pages/network/ip_details';
import { getNetworkUrl, getOverviewUrl, getTimelinesUrl } from '../../link_to';
import * as i18n from '../translations';
import { getHostsUrl } from '../../link_to/redirect_to_hosts';
import { HostsTableType } from '../../../store/hosts/model';
import { SiemPageName } from '../../../pages/home/home_navigations';

export interface NavigationParams {
  pageName?: SiemPageName;
  hostName?: string;
  tabName?: HostsTableType;
}

export const setBreadcrumbs = (pathname: string, params?: NavigationParams) => {
  const breadcrumbs = getBreadcrumbsForRoute(pathname, params);
  if (breadcrumbs) {
    chrome.breadcrumbs.set(breadcrumbs);
  }
};

export const siemRootBreadcrumb: Breadcrumb[] = [
  {
    text: APP_NAME,
    href: getOverviewUrl(),
  },
];

export const rootBreadcrumbs: { [name: string]: Breadcrumb[] } = {
  overview: siemRootBreadcrumb,
  hosts: [
    ...siemRootBreadcrumb,
    {
      text: i18n.HOSTS,
      href: getHostsUrl(),
    },
  ],
  network: [
    ...siemRootBreadcrumb,
    {
      text: i18n.NETWORK,
      href: getNetworkUrl(),
    },
  ],
  timelines: [
    ...siemRootBreadcrumb,
    {
      text: i18n.TIMELINES,
      href: getTimelinesUrl(),
    },
  ],
};

export const getBreadcrumbsForRoute = (
  pathname: string,
  params?: NavigationParams
): Breadcrumb[] | null => {
  const removeSlash = pathname.replace(/\/$/, '');
  const trailingPath = removeSlash.match(/([^\/]+$)/);

  if (trailingPath !== null) {
    if (params != null && params.pageName === SiemPageName.hosts) {
      return [...siemRootBreadcrumb, ...getHostDetailsBreadcrumbs(params)];
    }
    if (Object.keys(rootBreadcrumbs).includes(trailingPath[0])) {
      return rootBreadcrumbs[trailingPath[0]];
    }
    if (pathname.match(/network\/ip\/.*?/)) {
      return [...siemRootBreadcrumb, ...getIPDetailsBreadcrumbs(trailingPath[0])];
    }
  }
  return null;
};
