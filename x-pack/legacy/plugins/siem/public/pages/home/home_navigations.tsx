/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

import { NavTab } from '../../components/navigation/tab_navigation';
import {
  getOverviewUrl,
  getHostsUrl,
  getNetworkUrl,
  getTimelinesUrl,
} from '../../components/link_to';
export const navTabs: NavTab[] = [
  {
    id: 'overview',
    name: i18n.translate('xpack.siem.navigation.overview', {
      defaultMessage: 'Overview',
    }),
    href: getOverviewUrl(),
    disabled: false,
  },
  {
    id: 'hosts',
    name: i18n.translate('xpack.siem.navigation.hosts', {
      defaultMessage: 'Hosts',
    }),
    href: getHostsUrl(),
    disabled: false,
  },
  {
    id: 'network',
    name: i18n.translate('xpack.siem.navigation.network', {
      defaultMessage: 'Network',
    }),
    href: getNetworkUrl(),
    disabled: false,
  },
  {
    id: 'timelines',
    name: i18n.translate('xpack.siem.navigation.timelines', {
      defaultMessage: 'Timelines',
    }),
    href: getTimelinesUrl(),
    disabled: false,
  },
];
