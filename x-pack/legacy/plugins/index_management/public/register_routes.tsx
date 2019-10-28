/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import routes from 'ui/routes';
import { I18nContext } from 'ui/i18n';
import { setHttpClient } from './app/services/api';
import { setUrlService } from './app/services/navigation';

import { App } from './app/app';
import { BASE_PATH } from '../common/constants/base_path';

import template from './index.html';
import { manageAngularLifecycle } from './app/lib/manage_angular_lifecycle';
import { indexManagementStore } from './app/store';

let elem: HTMLElement | null;

const renderReact = async () => {
  render(
    <I18nContext>
      <Provider store={indexManagementStore()}>
        <App />
      </Provider>
    </I18nContext>,
    elem
  );
};

export const registerRoutes = () => {
  routes.when(`${BASE_PATH}:view?/:action?/:id?`, {
    template,
    controller: (
      $scope: any,
      $route: any,
      $http: ng.IHttpService,
      kbnUrl: any,
      $rootScope: any
    ) => {
      // clean up previously rendered React app if one exists
      // this happens because of React Router redirects
      if (elem) {
        unmountComponentAtNode(elem);
      }
      // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
      // e.g. to check license status per request.
      setHttpClient($http);
      setUrlService({
        change(url: string) {
          kbnUrl.change(url);
          $rootScope.$digest();
        },
      });
      $scope.$$postDigest(() => {
        elem = document.getElementById('indexManagementReactRoot');
        renderReact();
        manageAngularLifecycle($scope, $route, elem);
      });
    },
  });
};
