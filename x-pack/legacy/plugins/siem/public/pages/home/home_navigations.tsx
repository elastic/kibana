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

export const navTabs: NavTab[] = [
  {
    id: 'overview',
    name: i18n.OVERVIEW,
    href: getOverviewUrl(),
    disabled: false,
  },
  {
    id: 'hosts',
    name: i18n.HOSTS,
    href: getHostsUrl(),
    disabled: false,
  },
  {
    id: 'network',
    name: i18n.NETWORK,
    href: getNetworkUrl(),
    disabled: false,
  },
  {
    id: 'timelines',
    name: i18n.TIMELINES,
    href: getTimelinesUrl(),
    disabled: false,
  },
];
