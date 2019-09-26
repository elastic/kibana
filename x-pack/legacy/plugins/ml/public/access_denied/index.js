/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import uiRoutes from 'ui/routes';
import uiChrome from 'ui/chrome';
import template from './index.html';

uiRoutes.when('/access-denied', {
  template,
  controllerAs: 'accessDenied',
  controller($window, kbnUrl, kbnBaseUrl) {
    this.goToKibana = () => {
      $window.location.href = uiChrome.getBasePath() + kbnBaseUrl;
    };

    this.retry = () => {
      return kbnUrl.redirect('/jobs');
    };
  }
});
