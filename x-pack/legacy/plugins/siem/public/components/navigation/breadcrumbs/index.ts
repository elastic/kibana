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
import { getBreadcrumbs as getDetectionRulesBreadcrumbs } from '../../../pages/detection_engine/rules/utils';
import { SiemPageName } from '../../../pages/home/types';
import { RouteSpyState, HostRouteSpyState, NetworkRouteSpyState } from '../../../utils/route/types';
import { getOverviewUrl } from '../../link_to';

import { TabNavigationProps } from '../tab_navigation/types';
import { getSearch } from '../helpers';
import { SearchNavTab } from '../types';

export const setBreadcrumbs = (spyState: RouteSpyState & TabNavigationProps) => {
  const breadcrumbs = getBreadcrumbsForRoute(spyState);
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

const isNetworkRoutes = (spyState: RouteSpyState): spyState is NetworkRouteSpyState =>
  spyState != null && spyState.pageName === SiemPageName.network;

const isHostsRoutes = (spyState: RouteSpyState): spyState is HostRouteSpyState =>
  spyState != null && spyState.pageName === SiemPageName.hosts;

const isDetectionsRoutes = (spyState: RouteSpyState) =>
  spyState != null && spyState.pageName === SiemPageName.detections;

export const getBreadcrumbsForRoute = (
  object: RouteSpyState & TabNavigationProps
): Breadcrumb[] | null => {
  const spyState: RouteSpyState = omit('navTabs', object);
  if (isHostsRoutes(spyState) && object.navTabs) {
    const tempNav: SearchNavTab = { urlKey: 'host', isDetailPage: false };
    let urlStateKeys = [getOr(tempNav, spyState.pageName, object.navTabs)];
    if (spyState.tabName != null) {
      urlStateKeys = [...urlStateKeys, getOr(tempNav, spyState.tabName, object.navTabs)];
    }
    return [
      ...siemRootBreadcrumb,
      ...getHostDetailsBreadcrumbs(
        spyState,
        urlStateKeys.reduce(
          (acc: string[], item: SearchNavTab) => [...acc, getSearch(item, object)],
          []
        )
      ),
    ];
  }
  if (isNetworkRoutes(spyState) && object.navTabs) {
    const tempNav: SearchNavTab = { urlKey: 'network', isDetailPage: false };
    let urlStateKeys = [getOr(tempNav, spyState.pageName, object.navTabs)];
    if (spyState.tabName != null) {
      urlStateKeys = [...urlStateKeys, getOr(tempNav, spyState.tabName, object.navTabs)];
    }
    return [
      ...siemRootBreadcrumb,
      ...getIPDetailsBreadcrumbs(
        spyState,
        urlStateKeys.reduce(
          (acc: string[], item: SearchNavTab) => [...acc, getSearch(item, object)],
          []
        )
      ),
    ];
  }
  if (isDetectionsRoutes(spyState) && object.navTabs) {
    const tempNav: SearchNavTab = { urlKey: 'detections', isDetailPage: false };
    let urlStateKeys = [getOr(tempNav, spyState.pageName, object.navTabs)];
    if (spyState.tabName != null) {
      urlStateKeys = [...urlStateKeys, getOr(tempNav, spyState.tabName, object.navTabs)];
    }

    return [
      ...siemRootBreadcrumb,
      ...getDetectionRulesBreadcrumbs(
        spyState,
        urlStateKeys.reduce(
          (acc: string[], item: SearchNavTab) => [...acc, getSearch(item, object)],
          []
        )
      ),
    ];
  }
  if (
    spyState != null &&
    object.navTabs &&
    spyState.pageName &&
    object.navTabs[spyState.pageName]
  ) {
    return [
      ...siemRootBreadcrumb,
      {
        text: object.navTabs[spyState.pageName].name,
        href: '',
      },
    ];
  }

  return null;
};
