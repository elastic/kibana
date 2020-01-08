/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import routes from 'ui/routes';

import { CoreStart } from '../../../../../src/core/public';

import { mountReactApp, unmountReactApp } from './app';
import { REACT_ROOT_ID } from './app/constants';
import { BASE_PATH } from '../common/constants';
import { setHttpClient } from './app/services/api';

import template from './index.html';
import { manageAngularLifecycle } from './app/lib/manage_angular_lifecycle';

let elem: HTMLElement | null;

export const registerRoutes = (core: CoreStart) => {
  routes.when(`${BASE_PATH}:view?/:action?/:id?`, {
    template,
    controller: ($scope: any, $route: any, $http: ng.IHttpService) => {
      // clean up previously rendered React app if one exists
      // this happens because of React Router redirects
      unmountReactApp(elem);

      // TODO $http is still needed for the ILM actions
      // Once ILM is migrated to NP, it should be able to be removed
      setHttpClient($http);

      $scope.$$postDigest(() => {
        elem = document.getElementById(REACT_ROOT_ID);
        mountReactApp(elem, { core });
        manageAngularLifecycle($scope, $route, elem);
      });
    },
  });
};
