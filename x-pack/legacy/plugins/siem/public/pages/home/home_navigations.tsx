/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getDetectionEngineUrl,
  getOverviewUrl,
  getNetworkUrl,
  getTimelinesUrl,
  getHostsUrl,
} from '../../components/link_to';
import * as i18n from './translations';
import { SiemPageName, SiemNavTab } from './types';

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
  [SiemPageName.detections]: {
    id: SiemPageName.detections,
    name: i18n.DETECTION_ENGINE,
    href: getDetectionEngineUrl(),
    disabled: false,
    urlKey: 'detections',
  },
  [SiemPageName.timelines]: {
    id: SiemPageName.timelines,
    name: i18n.TIMELINES,
    href: getTimelinesUrl(),
    disabled: false,
    urlKey: 'timeline',
  },
};
