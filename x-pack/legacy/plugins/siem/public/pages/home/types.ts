/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
