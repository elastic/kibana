/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import routes from 'ui/routes';
import { management } from 'ui/management';
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import template from './app.html';
import { App } from './app';
import { setHttpClient, setSavedObjectsClient } from './lib/api';
import { I18nContext } from 'ui/i18n';
import { manageAngularLifecycle } from './lib/manage_angular_lifecycle';
import { PLUGIN } from '../common/constants';
import { LICENSE_STATUS_UNAVAILABLE, LICENSE_STATUS_INVALID } from '../../../common/constants';

let elem;
const renderReact = async (elem, licenseStatus) => {
  render(
    <I18nContext>
      <App licenseStatus={licenseStatus} />
    </I18nContext>,
    elem
  );
};
routes.when('/management/elasticsearch/watcher/:param1?/:param2?/:param3?/:param4?', {
  template,
  controller: class WatcherController {
    constructor($injector, $scope, $http, Private) {
      const $route = $injector.get('$route');
      const licenseStatus = xpackInfo.get(`features.${PLUGIN.ID}`);

      // clean up previously rendered React app if one exists
      // this happens because of React Router redirects
      elem && unmountComponentAtNode(elem);
      setSavedObjectsClient(Private(SavedObjectsClientProvider));
      // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
      // e.g. to check license status per request.
      setHttpClient($http);
      $scope.$$postDigest(() => {
        elem = document.getElementById('watchReactRoot');
        renderReact(elem, licenseStatus);
        manageAngularLifecycle($scope, $route, elem);
      });
    }
  },
  controllerAs: 'watchRoute',
});

routes.defaults(/\/management/, {
  resolve: {
    watcherManagementSection: () => {
      const watchesSection = management.getSection('elasticsearch/watcher');
      const licenseStatus = xpackInfo.get(`features.${PLUGIN.ID}`);
      const { status } = licenseStatus;

      if (status === LICENSE_STATUS_INVALID || status === LICENSE_STATUS_UNAVAILABLE) {
        return watchesSection.hide();
      }

      watchesSection.show();
    },
  },
});
