/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, CoreStart, AppMountParameters } from '@kbn/core/public';
import type { NavigationPublicPluginStart as NavigationStart } from '@kbn/navigation-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
export type { MonitoringConfig } from '../server';
export type { MLJobs } from '../server/lib/elasticsearch/get_ml_jobs';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { FleetStart } from '@kbn/fleet-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ReactNode } from 'react';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { CloudConnectedPluginStart } from '@kbn/cloud-connect-plugin/public';

export interface MonitoringStartPluginDependencies {
  navigation: NavigationStart;
  data: DataPublicPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  usageCollection: UsageCollectionSetup;
  dataViews: DataViewsPublicPluginStart;
  dashboard?: DashboardStart;
  fleet?: FleetStart;
  share: SharePluginStart;
  fieldsMetadata: FieldsMetadataPublicStart;
  cloudConnect?: CloudConnectedPluginStart;
}

interface LegacyStartDependencies {
  element: HTMLElement;
  core: CoreStart;
  isCloud: boolean;
  cloudBaseUrl?: string;
  hasEnterpriseLicense: boolean;
  pluginInitializerContext: PluginInitializerContext;
  externalConfig: Array<Array<string | number> | Array<string | boolean>>;
  appMountParameters: AppMountParameters;
}

export type LegacyMonitoringStartPluginDependencies = MonitoringStartPluginDependencies &
  LegacyStartDependencies;

export type MonitoringStartServices = CoreStart & MonitoringStartPluginDependencies;

export interface HeaderMenuPortalProps {
  children: ReactNode;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  theme$: AppMountParameters['theme$'];
}
