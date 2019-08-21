/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as i18n from './translations';
import { getTabsOnHostsUrl, getHostsUrl } from '../../components/link_to';
import { NavTab } from '../../components/navigation/tab_navigation';

export enum HostsTabName {
  hosts = 'hosts',
  authentications = 'authentications',
  uncommonProcesses = 'uncommon_processes',
  anomalies = 'anomalies',
  events = 'events',
}

export const navTabs: NavTab[] = [
  {
    id: HostsTabName.hosts,
    name: i18n.NAVIGATION_HOSTS_TITLE,
    href: getHostsUrl(),
    disabled: false,
  },
  {
    id: HostsTabName.authentications,
    name: i18n.NAVIGATION_AUTHENTICATIONS_TITLE,
    href: getTabsOnHostsUrl(HostsTabName.authentications),
    disabled: false,
  },
  {
    id: HostsTabName.uncommonProcesses,
    name: i18n.NAVIGATION_UNCOMMON_PROCESSES_TITLE,
    href: getTabsOnHostsUrl(HostsTabName.uncommonProcesses),
    disabled: false,
  },
  {
    id: HostsTabName.anomalies,
    name: i18n.NAVIGATION_ANOMALIES_TITLE,
    href: getTabsOnHostsUrl(HostsTabName.anomalies),
    disabled: false,
  },
  {
    id: HostsTabName.events,
    name: i18n.NAVIGATION_EVENTS_TITLE,
    href: getTabsOnHostsUrl(HostsTabName.events),
    disabled: false,
  },
];
