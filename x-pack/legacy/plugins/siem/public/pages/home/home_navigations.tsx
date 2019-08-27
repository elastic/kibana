/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as i18n from '../../components/navigation/translations';
import { NavTab } from '../../components/navigation/tab_navigation';
import {
  getOverviewUrl,
  getNetworkUrl,
  getTimelinesUrl,
  getHostsUrl,
} from '../../components/link_to';

export enum SiemPageName {
  overview = 'overview',
  hosts = 'hosts',
  network = 'network',
  timelines = 'timelines',
}

export interface SiemNavTab {
  [SiemPageName.overview]: NavTab;
  [SiemPageName.hosts]: NavTab;
  [SiemPageName.network]: NavTab;
  [SiemPageName.timelines]: NavTab;
}

export const navTabs = {
  [SiemPageName.overview]: {
    id: SiemPageName.overview,
    name: i18n.OVERVIEW,
    href: getOverviewUrl(),
    disabled: false,
  },
  [SiemPageName.hosts]: {
    id: SiemPageName.hosts,
    name: i18n.HOSTS,
    href: getHostsUrl(),
    disabled: false,
  },
  [SiemPageName.network]: {
    id: SiemPageName.network,
    name: i18n.NETWORK,
    href: getNetworkUrl(),
    disabled: false,
  },
  [SiemPageName.timelines]: {
    id: SiemPageName.timelines,
    name: i18n.TIMELINES,
    href: getTimelinesUrl(),
    disabled: false,
  },
};
