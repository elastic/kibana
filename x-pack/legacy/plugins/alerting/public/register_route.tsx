/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import routes from 'ui/routes';
// @ts-ignore not typed yet
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import { I18nContext } from 'ui/i18n';
import template from './app.html';
import { App } from './app';
import { setHttpClient, manageAngularLifecycle } from './lib';

const renderReact = async (element: any) => {
  render(
    <I18nContext>
      <App />
    </I18nContext>,
    element
  );
};

routes.when('/management/elasticsearch/alerting/:param1?/:param2?/:param3?/:param4?', {
  template,
  controller: (() => {
    let elReactRoot: HTMLElement | undefined | null;
    return ($injector: any, $scope: any, $http: any, Private: any) => {
      const $route = $injector.get('$route');
      // clean up previously rendered React app if one exists
      // this happens because of React Router redirects
      if (elReactRoot) {
        unmountComponentAtNode(elReactRoot);
      }
      // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
      // e.g. to check license status per request.
      setHttpClient($http);
      $scope.$$postDigest(() => {
        elReactRoot = document.getElementById('alertingReactRoot');
        renderReact(elReactRoot);
        manageAngularLifecycle($scope, $route, elReactRoot);
      });
    };
  })(),
});
