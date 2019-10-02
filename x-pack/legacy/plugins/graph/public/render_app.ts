/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import angular from 'angular';
// @ts-ignore
import { initAngularModule } from './app';
import { AppMountContext } from 'kibana/public';

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
  //   chrome,
  //   savedGraphWorkspaces,
  //   toastNotifications,
  //   savedObjectsClient, //Private(SavedObjectsClientProvider)
  //   indexPatterns, //data.indexPatterns.indexPatterns
  //   savedWorkspacesClient, //Private(SavedWorkspacesProvider)
  //   kbnBaseUrl,
  //   kbnUrl,
  //   config, //uiSettings?
  //   savedObjectRegistry, //Private(SavedObjectRegistryProvider)
  // X capabilities,
  //   formatAngularHttpError,
  // X coreStart, //npStart.core
  //   confirmModal,
  //   http, //$http
  //   showSaveModal,
  // } = deps;

export const renderApp = ({ core }: AppMountContext, { element , appBasePath }: { element: HTMLElement, appBasePath: string }) => {
  const deps = {
    capabilities: core.application.capabilities.graph,
    coreStart: core,

  }
  initAngularModule(moduleName, deps);
  // eslint-disable-next-line
  element.innerHTML = mainTemplate(appBasePath);
  const $injector = angular.bootstrap(element, [moduleName]);
  return () => $injector.get('$rootScope').$destroy();
};
