/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import angular from 'angular';
import { AppMountContext } from 'kibana/public';
import { DataSetup } from 'src/legacy/core_plugins/data/public';
import { AngularHttpError } from 'ui/notify/lib/format_angular_http_error';
// @ts-ignore
import { initAngularModule } from './app';

const mainTemplate = (basePath: string) => `<div>
  <!-- This base tag is key to making this work -->
  <base href="${basePath}" />
  <div ng-view></div>
</div>
`;

const moduleName = 'app/graph';

export interface GraphDependencies {
  element: HTMLElement;
  appBasePath: string;
  data: DataSetup;
  fatalError: (error: AngularHttpError | Error | string, location?: string) => void;
  xpackInfo: { get(path: string): unknown };
}

export interface LegacyAngularInjectedDependencies {
  /**
   * angular $http service
   */
  $http: any;
  /**
   * src/legacy/ui/public/modals/confirm_modal.js
   */
  confirmModal: any;
  /**
   * Private(SavedObjectRegistryProvider)
   */
  savedObjectRegistry: any;
  kbnUrl: any;
  kbnBaseUrl: any;
  /**
   * Private(SavedWorkspacesProvider)
   */

  savedWorkspacesClient: any;
  savedGraphWorkspaces: any;
  /**
   * Private(SavedObjectsClientProvider)
   */

  savedObjectsClient: any;

  // These are static values currently fetched from ui/chrome
  canEditDrillDownUrls: string;
  graphSavePolicy: string;
}

export const renderApp = (
  { core }: AppMountContext,
  { element, appBasePath, data, fatalError, xpackInfo }: GraphDependencies,
  angularDeps: LegacyAngularInjectedDependencies
) => {
  const deps = {
    capabilities: core.application.capabilities.graph,
    coreStart: core,
    chrome: core.chrome,
    config: core.uiSettings,
    toastNotifications: core.notifications.toasts,
    indexPatterns: data.indexPatterns.indexPatterns,
    fatalError,
    xpackInfo,
    ...angularDeps,
  };
  initAngularModule(moduleName, deps);
  const mountpoint = document.createElement('div');
  // eslint-disable-next-line
  mountpoint.innerHTML = mainTemplate(appBasePath);
  const $injector = angular.bootstrap(mountpoint, [moduleName]);
  element.appendChild(mountpoint);
  return () => $injector.get('$rootScope').$destroy();
};
