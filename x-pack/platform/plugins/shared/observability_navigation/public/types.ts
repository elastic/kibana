/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin as PluginClass } from '@kbn/core/public';
import { Observable } from 'rxjs';
import type { FleetStartContract } from '@kbn/fleet-plugin/server/plugin';
import { ObservabilityDynamicNavigation } from '../common/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityNavigationPluginSetup {}

export interface ObservabilityNavigationPluginStart {
  sideNav$: Observable<ObservabilityDynamicNavigation[]>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityNavigationPluginSetupDependencies {}
export interface ObservabilityNavigationPluginStartDependencies {
  fleet?: FleetStartContract;
}

export type ObservabilityNavigationPluginClass = PluginClass<
  ObservabilityNavigationPluginSetup,
  ObservabilityNavigationPluginStart,
  ObservabilityNavigationPluginSetupDependencies,
  ObservabilityNavigationPluginStartDependencies
>;
