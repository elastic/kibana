/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import routes from 'ui/routes';

import template from './index.html';
import { PLUGIN } from '../common/constants';
import { BASE_PATH, REACT_ROOT_ID } from './constants';
import { Core, Plugins } from './legacy';
import { mountReactApp, unmountReactApp } from './app';

export class TasksPlugin {
  public start(core: Core, plugins: Plugins): void {
    const {
      __LEGACY: { management },
    } = plugins;

    // Register Management section
    const esSection = management.getSection('elasticsearch');
    esSection.register(PLUGIN.ID, {
      visible: true,
      display: 'Tasks',
      order: 11,
      url: `#${BASE_PATH}`,
    });

    // Register Angular route
    routes.when(`${BASE_PATH}/:section?/:subsection?`, {
      template,
      controller: ($scope: any, $route: any) => {
        // Angular lifecycle
        const appRoute = $route.current;
        const onLocationChangeSuccess = () => {
          const currentRoute = $route.current;
          const isInAppNavigation = currentRoute.$$route.template === appRoute.$$route.template;

          // When we navigate within Tasks UI, prevent Angular from re-matching the route and rebuild the app
          if (isInAppNavigation) {
            $route.current = appRoute;
          } else {
            // Any clean up when the user leaves the app
          }

          // Unmount React app when leaving the Angular route controller
          $scope.$on('$destroy', () => {
            unmountReactApp(document.getElementById(REACT_ROOT_ID));
          });
          $scope.$$postDigest(() => {
            const elem = document.getElementById(REACT_ROOT_ID);
            unmountReactApp(elem);
            mountReactApp(elem, { core });
          });
        };

        // This app currently does not have a React router, so no location change success occurs
        // For now, we will call it directly when the Angular controller is initialized.
        onLocationChangeSuccess();
      },
    });
  }
}
