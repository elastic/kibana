/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import { setHttpClient } from './services/api';
import chrome from 'ui/chrome';
import { App } from './app';
import { BASE_PATH } from '../common/constants';
import { indexLifecycleManagementStore } from './store';
import { I18nContext } from 'ui/i18n';
import { setUrlService } from './services/navigation';

import routes from 'ui/routes';

import template from './main.html';
import { manageAngularLifecycle } from './services/manage_angular_lifecycle';
let elem;
const renderReact = async elem => {
  render(
    <I18nContext>
      <Provider store={indexLifecycleManagementStore()}>
        <App />
      </Provider>
    </I18nContext>,
    elem
  );
};
if (chrome.getInjected('ilmUiEnabled')) {
  routes.when(`${BASE_PATH}:view?/:action?/:id?`, {
    template: template,
    controllerAs: 'indexLifecycleManagement',
    controller: class IndexLifecycleManagementController {
      constructor($scope, $route, $http, kbnUrl, $rootScope) {
        // clean up previously rendered React app if one exists
        // this happens because of React Router redirects
        elem && unmountComponentAtNode(elem);
        setHttpClient($http);
        setUrlService({
          change(url) {
            kbnUrl.change(url);
            $rootScope.$digest();
          },
        });
        $scope.$$postDigest(() => {
          elem = document.getElementById('indexLifecycleManagementReactRoot');
          renderReact(elem);
          manageAngularLifecycle($scope, $route, elem);
        });
      }
    },
  });
}
