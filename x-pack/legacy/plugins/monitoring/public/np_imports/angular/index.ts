/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import angular, { IModule } from 'angular';
import { uiRoutes } from './helpers/routes';
import { Legacy } from '../legacy';
import { uiModules } from './helpers/modules';
import { configureAppAngularModule } from '../../../../../../../src/plugins/kibana_legacy/public';
import { localAppModule, appModuleName } from './app_modules';

const SAFARI_FIX = 'kbnLocalApplicationWrapper';
export class AngularApp {
  private injector?: angular.auto.IInjectorService;

  constructor({ core, element, data: { query }, navigation, isCloud, pluginInitializerContext }: any) { // TODO: add types
    //uiModules.implement();
    const app: IModule = localAppModule(core, query, navigation);
    app.run(($injector: angular.auto.IInjectorService) => {
      this.injector = $injector
      Legacy.init(core, query.timefilter.timefilter, this.injector, isCloud);
    });

    app.config(($routeProvider: unknown) => uiRoutes.addToProvider($routeProvider));

    console.log('...CORE:', core)

    const np = { core, env: pluginInitializerContext.env }
    configureAppAngularModule(app, np, true);
    const appElement = document.createElement('div');
    appElement.setAttribute('style', 'height: 100%');
    appElement.setAttribute('class', SAFARI_FIX);
    appElement.innerHTML = `<div ng-view style="height: 100%" id="monitoring-angular-app" class="${SAFARI_FIX}"></div>`;

    if (!element.classList.contains(SAFARI_FIX)) {
      element.classList.add(SAFARI_FIX)
    }

    angular.bootstrap(appElement, [appModuleName]);
    angular.element(element).append(appElement);
  }

  public destroy = () => {
    if (this.injector) {
      this.injector.get('$rootScope').$destroy();
    }
  };
}
