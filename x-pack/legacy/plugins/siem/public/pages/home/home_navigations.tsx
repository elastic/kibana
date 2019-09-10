/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as i18n from './translations';
import {
  getOverviewUrl,
  getNetworkUrl,
  getTimelinesUrl,
  getHostsUrl,
} from '../../components/link_to';
import { NavTab } from '../../components/navigation/types';

export enum SiemPageName {
  overview = 'overview',
  hosts = 'hosts',
  network = 'network',
  timelines = 'timelines',
}

export type SiemNavTabKey =
  | SiemPageName.overview
  | SiemPageName.hosts
  | SiemPageName.network
  | SiemPageName.timelines;

export type SiemNavTab = Record<SiemNavTabKey, NavTab>;

export const navTabs: SiemNavTab = {
  [SiemPageName.overview]: {
    id: SiemPageName.overview,
    name: i18n.OVERVIEW,
    href: getOverviewUrl(),
    disabled: false,
    urlKey: 'overview',
  },
  [SiemPageName.hosts]: {
    id: SiemPageName.hosts,
    name: i18n.HOSTS,
    href: getHostsUrl(),
    disabled: false,
    urlKey: 'host',
  },
  [SiemPageName.network]: {
    id: SiemPageName.network,
    name: i18n.NETWORK,
    href: getNetworkUrl(),
    disabled: false,
    urlKey: 'network',
  },
  [SiemPageName.timelines]: {
    id: SiemPageName.timelines,
    name: i18n.TIMELINES,
    href: getTimelinesUrl(),
    disabled: false,
    urlKey: 'timeline',
  },
};
