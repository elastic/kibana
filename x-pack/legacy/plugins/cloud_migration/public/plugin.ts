/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import template from './index.html';
import { PLUGIN } from '../common/constants';
import { BASE_PATH, REACT_ROOT_ID } from './constants';
import { Core, Plugins } from './shim';
import { mountReactApp, unmountReactApp } from './app';

/**
 * Cloud migration UI Plugin
 */
export class CloudMigrationPlugin {
  public start(core: Core, plugins: Plugins) {
    // called after all plugins are set up
    const { i18n, router, http } = core;
    const esSection = plugins.management.sections.getSection('elasticsearch');

    // Register Management section
    esSection.register(PLUGIN.ID, {
      visible: true,
      display: i18n.translate('xpack.cloudMigration.appName', {
        defaultMessage: 'Cloud migration',
      }),
      order: 11,
      url: `#${BASE_PATH}`,
    });

    // Register Angular Route
    router.angular.registerRoute(`${BASE_PATH}/:section?/:subsection?`, {
      template,
      controllerAs: 'cloudMigrationController',
      controller: ($scope: any, $route: any, $http: ng.IHttpService, $q: any) => {
        http.client.set($http);

        // Angular Lifecycle
        const appRoute = $route.current;
        const stopListeningForLocationChange = $scope.$on('$locationChangeSuccess', () => {
          const currentRoute = $route.current;
          const isInAppNavigation = currentRoute.$$route.template === appRoute.$$route.template;

          // When we navigate within Cloud Migration, prevent Angular from re-matching the route and rebuild the app
          if (isInAppNavigation) {
            $route.current = appRoute;
          } else {
            // Any clean up when the user leaves the app...
          }

          // Unmount React app when leaving the Angular route controller
          $scope.$on('$destroy', () => {
            if (stopListeningForLocationChange) {
              stopListeningForLocationChange();
            }
            unmountReactApp(document.getElementById(REACT_ROOT_ID));
          });

          $scope.$$postDigest(() => {
            const elem = document.getElementById(REACT_ROOT_ID);
            unmountReactApp(elem);
            mountReactApp(elem, { core, plugins });
          });
        });
      },
    });
  }

  public stop() {
    // called when plugin is torn down, aka window.onbeforeunload
  }
}
