/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Breadcrumb } from 'ui/chrome';

import { hostsModel } from '../../../store';
import { HostsTableType } from '../../../store/hosts/model';
import { getHostsUrl, getHostDetailsUrl } from '../../../components/link_to/redirect_to_hosts';

import * as i18n from '../translations';
import { RouteSpyState } from '../../../utils/route/types';

export const type = hostsModel.HostsType.details;

const TabNameMappedToI18nKey = {
  [HostsTableType.hosts]: i18n.NAVIGATION_ALL_HOSTS_TITLE,
  [HostsTableType.authentications]: i18n.NAVIGATION_AUTHENTICATIONS_TITLE,
  [HostsTableType.uncommonProcesses]: i18n.NAVIGATION_UNCOMMON_PROCESSES_TITLE,
  [HostsTableType.anomalies]: i18n.NAVIGATION_ANOMALIES_TITLE,
  [HostsTableType.events]: i18n.NAVIGATION_EVENTS_TITLE,
};

export const getBreadcrumbs = (params: RouteSpyState, search: string[]): Breadcrumb[] => {
  let breadcrumb = [
    {
      text: i18n.PAGE_TITLE,
      href: `${getHostsUrl()}${search && search[0] ? search[0] : ''}`,
    },
  ];
  if (params.detailName != null) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: params.detailName,
        href: `${getHostDetailsUrl(params.detailName)}${search && search[1] ? search[1] : ''}`,
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
