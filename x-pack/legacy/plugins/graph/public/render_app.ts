/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import angular from 'angular';
// @ts-ignore
import { initAngularModule } from './app';
import { AppMountContext } from 'kibana/public';
import { MinimalSaveModalProps } from 'ui/saved_objects/show_saved_object_save_modal';
import { DataSetup } from 'src/legacy/core_plugins/data/public';

const mainTemplate = (basePath: string) => `
  <!-- This base tag is key to making this work -->
  <base href="${basePath}" />
  <div ng-view></div>
</div>
`;

const moduleName = 'app/graph';

  // const {
  //   xpackInfo,
  //   addAppRedirectMessageToUrl,
  //   fatalError,
  // X chrome,
  // I savedGraphWorkspaces,
  // X toastNotifications,
  // I savedObjectsClient, //Private(SavedObjectsClientProvider)
  // X indexPatterns, //data.indexPatterns.indexPatterns
  // I savedWorkspacesClient, //Private(SavedWorkspacesProvider)
  // I kbnBaseUrl,
  // I kbnUrl,
  // X config, //uiSettings?
  // I savedObjectRegistry, //Private(SavedObjectRegistryProvider)
  // X capabilities,
  // X coreStart, //npStart.core
  // I confirmModal,
  // X http, //$http
  // X showSaveModal,
  // } = deps;

export interface GraphDeps {
  showSaveModal: (saveModal: React.ReactElement<MinimalSaveModalProps>) => void;
 element: HTMLElement; appBasePath: string; data: DataSetup
}

export const renderApp = ({ core }: AppMountContext, { element , appBasePath, showSaveModal, data }: GraphDeps) => {
  const deps = {
    capabilities: core.application.capabilities.graph,
    coreStart: core,
    http: core.http,
    chrome: core.chrome,
    config: core.uiSettings,
    showSaveModal: showSaveModal,
    toastNotifications: core.notifications.toasts,
    indexPatterns: data.indexPatterns.indexPatterns
  }
  initAngularModule(moduleName, deps);
  // eslint-disable-next-line
  element.innerHTML = mainTemplate(appBasePath);
  const $injector = angular.bootstrap(element, [moduleName]);
  return () => $injector.get('$rootScope').$destroy();
};
