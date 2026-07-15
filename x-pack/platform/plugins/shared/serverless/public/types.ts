/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChromeBreadcrumb,
  ChromeSetProjectBreadcrumbsParams,
  NavigationTreeDefinition,
  SolutionId,
} from '@kbn/core-chrome-browser';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { Observable } from 'rxjs';
import type { CardNavExtensionDefinition } from '@kbn/management-cards-navigation';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessPluginSetup {}

export interface ServerlessPluginStart {
  setBreadcrumbs: (
    breadcrumbs: ChromeBreadcrumb | ChromeBreadcrumb[],
    params?: Partial<ChromeSetProjectBreadcrumbsParams>
  ) => void;
  initNavigation(
    id: SolutionId,
    navigationTree$: Observable<NavigationTreeDefinition>,
    /**
     * Id of the plugin that owns this navigation tree. When provided, Core (in development builds)
     * attributes the tree's `link` references to this plugin for the navigation-dependency
     * enforcement test (see https://github.com/elastic/kibana/issues/66682).
     */
    ownerPluginId?: string
  ): void;
  getNavigationCards$(
    roleManagementEnabled?: boolean,
    extendCardNavDefinitions?: Record<string, CardNavExtensionDefinition>
  ): Observable<Record<string, CardNavExtensionDefinition> | undefined>;
}

export interface ServerlessPluginSetupDependencies {
  cloud: CloudSetup;
}

export interface ServerlessPluginStartDependencies {
  cloud: CloudStart;
}
