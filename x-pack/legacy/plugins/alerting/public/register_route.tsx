/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import routes from 'ui/routes';
import { management } from 'ui/management';
// @ts-ignore not typed yet
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import { I18nContext } from 'ui/i18n';
import template from './app.html';
import { App } from './app';
import { setHttpClient, manageAngularLifecycle } from './lib';
import { PLUGIN } from '../common/constants';
import { LICENSE_STATUS_UNAVAILABLE, LICENSE_STATUS_INVALID } from '../../../common/constants';

const renderReact = async (element: any, licenseStatus: any) => {
  render(
    <I18nContext>
      <App licenseStatus={licenseStatus} />
    </I18nContext>,
    element
  );
};

routes.when('/management/elasticsearch/alerting', {
  template,
  controller: (() => {
    let elReactRoot: HTMLElement | undefined | null;
    return ($injector: any, $scope: any, $http: any, Private: any) => {
      const $route = $injector.get('$route');
      const licenseStatus = xpackInfo.get(`features.${PLUGIN.ID}`);

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
        renderReact(elReactRoot, licenseStatus);
        manageAngularLifecycle($scope, $route, elReactRoot);
      });
    };
  })(),
});

routes.defaults(/\/management/, {
  resolve: {
    alertingManagementSection: () => {
      const alertingSection = management.getSection('elasticsearch/alerting');
      const licenseStatus = xpackInfo.get(`features.${PLUGIN.ID}`);
      const { status } = licenseStatus;

      if (status === LICENSE_STATUS_INVALID || status === LICENSE_STATUS_UNAVAILABLE) {
        return alertingSection.hide();
      }

      alertingSection.show();
    },
  },
});
