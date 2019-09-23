/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome, { Breadcrumb } from 'ui/chrome';

import { getOr } from 'lodash/fp';
import { APP_NAME } from '../../../../common/constants';
import { getBreadcrumbs as getHostDetailsBreadcrumbs } from '../../../pages/hosts/details/utils';
import { getBreadcrumbs as getIPDetailsBreadcrumbs } from '../../../pages/network/ip_details';
import { SiemPageName } from '../../../pages/home/types';
import { RouteSpyState } from '../../../utils/route/types';
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

export const getBreadcrumbsForRoute = (
  object: RouteSpyState & TabNavigationProps
): Breadcrumb[] | null => {
  if (object != null && object.navTabs && object.pageName === SiemPageName.hosts) {
    const tempNav: SearchNavTab = { urlKey: 'host', isDetailPage: false };
    let urlStateKeys = [getOr(tempNav, object.pageName, object.navTabs)];
    if (object.tabName != null) {
      urlStateKeys = [...urlStateKeys, getOr(tempNav, object.tabName, object.navTabs)];
    }
    return [
      ...siemRootBreadcrumb,
      ...getHostDetailsBreadcrumbs(
        object,
        urlStateKeys.reduce(
          (acc: string[], item: SearchNavTab) => [...acc, getSearch(item, object)],
          []
        )
      ),
    ];
  }
  if (object != null && object.navTabs && object.pageName === SiemPageName.network) {
    const tempNav: SearchNavTab = { urlKey: 'network', isDetailPage: false };
    const urlStateKeys = [getOr(tempNav, object.pageName, object.navTabs)];
    return [
      ...siemRootBreadcrumb,
      ...getIPDetailsBreadcrumbs(
        object.detailName,
        urlStateKeys.reduce((acc: string[], item) => [...acc, getSearch(item, object)], [])
      ),
    ];
  }
  if (object != null && object.navTabs && object.pageName && object.navTabs[object.pageName]) {
    return [
      ...siemRootBreadcrumb,
      {
        text: object.navTabs[object.pageName].name,
        href: '',
      },
    ];
  }

  return null;
};
