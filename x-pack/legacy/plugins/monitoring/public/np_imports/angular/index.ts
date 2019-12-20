/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import angular, { IModule } from 'angular';

import { AppMountContext, LegacyCoreStart } from 'kibana/public';

// @ts-ignore TODO: change to absolute path
import uiRoutes from 'plugins/monitoring/np_imports/ui/routes';
// @ts-ignore TODO: change to absolute path
import { uiModules } from 'plugins/monitoring/np_imports/ui/modules';
// @ts-ignore TODO: change to absolute path
import { registerTimefilterWithGlobalState } from 'plugins/monitoring/np_imports/ui/timefilter';
import { configureAppAngularModule } from '../legacy_imports';

import { localAppModule, appModuleName } from './modules';

export class AngularApp {
  private injector?: angular.auto.IInjectorService;

  constructor(
    { core }: AppMountContext,
    { appBasePath, element }: { appBasePath: string; element: HTMLElement }
  ) {
    uiModules.addToModule();
    const app: IModule = localAppModule(core);
    app.config(($routeProvider: any) => {
      $routeProvider.eagerInstantiationEnabled(false);
      uiRoutes.addToProvider($routeProvider);
    });
    configureAppAngularModule(app, core as LegacyCoreStart, true);
    registerTimefilterWithGlobalState(app);
    const appElement = document.createElement('div');
    appElement.setAttribute('style', 'height: 100%');
    appElement.innerHTML = `<div ng-app="monitoring">
        <div ng-view style="height: 100%" id="monitoring-angular-app"></div>
      </div>`;
    this.injector = angular.bootstrap(appElement, [appModuleName]);
    element.appendChild(appElement);
  }

  public destroy = () => {
    if (this.injector) {
      this.injector.get('$rootScope').$destroy();
    }
  };
}
