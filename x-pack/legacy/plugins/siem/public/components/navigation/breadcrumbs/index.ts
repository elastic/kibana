/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome, { Breadcrumb } from 'ui/chrome';

import { getOr, omit } from 'lodash/fp';
import { APP_NAME } from '../../../../common/constants';
import { getBreadcrumbs as getHostDetailsBreadcrumbs } from '../../../pages/hosts/details/utils';
import { getBreadcrumbs as getIPDetailsBreadcrumbs } from '../../../pages/network/ip_details';
import { SiemPageName } from '../../../pages/home/types';
import { RouteSpyState, HostRouteSpyState, NetworkRouteSpyState } from '../../../utils/route/types';
import { getOverviewUrl } from '../../link_to';

import { TabNavigationProps } from '../tab_navigation/types';
import { getSearch } from '../helpers';
import { SearchNavTab } from '../types';

export const setBreadcrumbs = (object: RouteSpyState & TabNavigationProps) => {
  const breadcrumbs = getBreadcrumbsForRoute(object);
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

const isNetworkRoutes = (object: RouteSpyState): object is NetworkRouteSpyState =>
  object != null && object.pageName === SiemPageName.network;

const isHostsRoutes = (object: RouteSpyState): object is HostRouteSpyState =>
  object != null && object.pageName === SiemPageName.hosts;

export const getBreadcrumbsForRoute = (
  spyState: RouteSpyState & TabNavigationProps
): Breadcrumb[] | null => {
  const object: RouteSpyState = omit('navTabs', spyState);
  if (isHostsRoutes(object) && spyState.navTabs) {
    const tempNav: SearchNavTab = { urlKey: 'host', isDetailPage: false };
    let urlStateKeys = [getOr(tempNav, object.pageName, spyState.navTabs)];
    if (object.tabName != null) {
      urlStateKeys = [...urlStateKeys, getOr(tempNav, object.tabName, spyState.navTabs)];
    }
    return [
      ...siemRootBreadcrumb,
      ...getHostDetailsBreadcrumbs(
        object,
        urlStateKeys.reduce(
          (acc: string[], item: SearchNavTab) => [...acc, getSearch(item, spyState)],
          []
        )
      ),
    ];
  }
  if (isNetworkRoutes(object) && spyState.navTabs) {
    const tempNav: SearchNavTab = { urlKey: 'network', isDetailPage: false };
    let urlStateKeys = [getOr(tempNav, object.pageName, spyState.navTabs)];
    if (object.tabName != null) {
      urlStateKeys = [...urlStateKeys, getOr(tempNav, object.tabName, spyState.navTabs)];
    }
    return [
      ...siemRootBreadcrumb,
      ...getIPDetailsBreadcrumbs(
        object,
        urlStateKeys.reduce(
          (acc: string[], item: SearchNavTab) => [...acc, getSearch(item, spyState)],
          []
        )
      ),
    ];
  }
  if (object != null && spyState.navTabs && object.pageName && spyState.navTabs[object.pageName]) {
    return [
      ...siemRootBreadcrumb,
      {
        text: spyState.navTabs[object.pageName].name,
        href: '',
      },
    ];
  }

  return null;
};
