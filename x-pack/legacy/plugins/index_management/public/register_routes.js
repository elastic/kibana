/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { setHttpClient } from './services/api';
import { setUrlService } from './services/navigation';

import { App } from './app';
import { BASE_PATH } from '../common/constants/base_path';

import routes from 'ui/routes';
import { I18nContext } from 'ui/i18n';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';

import template from './main.html';
import { manageAngularLifecycle } from './lib/manage_angular_lifecycle';
import { indexManagementStore } from './store';

let elem;
const renderReact = async (elem) => {
  render(
    <I18nContext>
      <Provider store={indexManagementStore()}>
        <App />
      </Provider>
    </I18nContext>,
    elem
  );
};

routes.when(`${BASE_PATH}:view?/:action?/:id?`, {
  template: template,
  k7Breadcrumbs: () => [
    MANAGEMENT_BREADCRUMB,
    {
      text: i18n.translate('xpack.idxMgmt.breadcrumb', {
        defaultMessage: 'Index management'
      }),
    }
  ],
  controllerAs: 'indexManagement',
  controller: class IndexManagementController {
    constructor($scope, $route, $http, kbnUrl, $rootScope) {
      // clean up previously rendered React app if one exists
      // this happens because of React Router redirects
      elem && unmountComponentAtNode(elem);
      // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
      // e.g. to check license status per request.
      setHttpClient($http);
      setUrlService({
        change(url) {
          kbnUrl.change(url);
          $rootScope.$digest();
        }
      });
      $scope.$$postDigest(() => {
        elem = document.getElementById('indexManagementReactRoot');
        renderReact(elem);
        manageAngularLifecycle($scope, $route, elem);
      });
    }
  }
});
