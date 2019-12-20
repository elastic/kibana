/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import routes from 'ui/routes';

import { CRUD_APP_BASE_PATH } from '../crud_app/constants';
import { setHttp, setUserHasLeftApp } from '../crud_app/services';
import template from './main.html';

export function registerRollupApp(renderFn) {
  routes.when(`${CRUD_APP_BASE_PATH}/:view?`, {
    template: template,
    controllerAs: 'rollupJobs',
    controller: class IndexRollupJobsController {
      constructor($scope, $route, $injector) {
        // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
        // e.g. to check license status per request.
        setHttp($injector.get('$http'));

        // If returning to the app, we'll need to reset this state.
        setUserHasLeftApp(false);

        $scope.$$postDigest(() => {
          const appElement = document.getElementById('rollupJobsReactRoot');
          const onUnmount = renderFn(appElement);

          const appRoute = $route.current;
          const stopListeningForLocationChange = $scope.$on('$locationChangeSuccess', () => {
            const currentRoute = $route.current;

            const isNavigationInApp = currentRoute.$$route.template === appRoute.$$route.template;

            // When we navigate within rollups, prevent Angular from re-matching the route and
            // rebuilding the app.
            if (isNavigationInApp) {
              $route.current = appRoute;
            } else {
              // Set internal flag so we can prevent reacting to the route change internally.
              setUserHasLeftApp(true);
            }
          });

          $scope.$on('$destroy', () => {
            stopListeningForLocationChange();
            onUnmount();
          });
        });
      }
    },
  });
}
