/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChromeBreadcrumb,
  ChromeSetProjectBreadcrumbsParams,
  SideNavComponent,
  NavigationTreeDefinition,
  SolutionId,
} from '@kbn/core-chrome-browser';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { Observable } from 'rxjs';
import type { PanelContentProvider } from '@kbn/shared-ux-chrome-navigation';
import { CardNavExtensionDefinition } from '@kbn/management-cards-navigation';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessPluginSetup {}

export interface ServerlessPluginStart {
  setBreadcrumbs: (
    breadcrumbs: ChromeBreadcrumb | ChromeBreadcrumb[],
    params?: Partial<ChromeSetProjectBreadcrumbsParams>
  ) => void;
  setProjectHome(homeHref: string): void;
  initNavigation(
    id: SolutionId,
    navigationTree$: Observable<NavigationTreeDefinition>,
    config?: {
      dataTestSubj?: string;
      panelContentProvider?: PanelContentProvider;
    }
  ): void;
  /**
   * @deprecated Use {@link ServerlessPluginStart.initNavigation} instead.
   */
  setSideNavComponentDeprecated: (navigation: SideNavComponent) => void;
  getNavigationCards(
    roleManagementEnabled?: boolean,
    extendCardNavDefinitions?: Record<string, CardNavExtensionDefinition>
  ): Record<string, CardNavExtensionDefinition> | undefined;
}

export interface ServerlessPluginSetupDependencies {
  cloud: CloudSetup;
}

export interface ServerlessPluginStartDependencies {
  cloud: CloudStart;
}
