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
import chrome from 'plugins/monitoring/np_imports/ui/chrome';
// @ts-ignore TODO: change to absolute path
import { uiModules } from 'plugins/monitoring/np_imports/ui/modules';
// @ts-ignore TODO: change to absolute path
import { registerTimefilterWithGlobalState } from 'plugins/monitoring/np_imports/ui/timefilter';
import { configureAppAngularModule } from './angular_config';

import { localAppModule, appModuleName } from './modules';

export class AngularApp {
  private injector?: angular.auto.IInjectorService;

  constructor({ core }: AppMountContext, { element }: { element: HTMLElement }) {
    uiModules.addToModule();
    const app: IModule = localAppModule(core);
    app.config(($routeProvider: any) => {
      $routeProvider.eagerInstantiationEnabled(false);
      uiRoutes.addToProvider($routeProvider);
    });
    configureAppAngularModule(app, core as LegacyCoreStart);
    registerTimefilterWithGlobalState(app);
    const appElement = document.createElement('div');
    appElement.setAttribute('style', 'height: 100%');
    appElement.innerHTML = '<div ng-view style="height: 100%" id="monitoring-angular-app"></div>';
    this.injector = angular.bootstrap(appElement, [appModuleName]);
    chrome.setInjector(this.injector);
    angular.element(element).append(appElement);
  }

  public destroy = () => {
    if (this.injector) {
      this.injector.get('$rootScope').$destroy();
    }
  };
}
