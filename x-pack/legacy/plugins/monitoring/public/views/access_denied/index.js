/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash';
import uiRoutes from 'ui/routes';
import uiChrome from 'ui/chrome';
import template from './index.html';

const tryPrivilege = ($http, kbnUrl) => {
  return $http
    .get('../api/monitoring/v1/check_access')
    .then(() => kbnUrl.redirect('/home'))
    .catch(noop);
};

uiRoutes.when('/access-denied', {
  template,
  resolve: {
    /*
     * The user may have been granted privileges in between leaving Monitoring
     * and before coming back to Monitoring. That means, they just be on this
     * page because Kibana remembers the "last app URL". We check for the
     * privilege one time up front (doing it in the resolve makes it happen
     * before the template renders), and then keep retrying every 5 seconds.
     */
    initialCheck($http, kbnUrl) {
      return tryPrivilege($http, kbnUrl);
    },
  },
  controllerAs: 'accessDenied',
  controller($scope, $injector) {
    const $window = $injector.get('$window');
    const kbnBaseUrl = $injector.get('kbnBaseUrl');
    const $http = $injector.get('$http');
    const kbnUrl = $injector.get('kbnUrl');
    const $interval = $injector.get('$interval');

    // The template's "Back to Kibana" button click handler
    this.goToKibana = () => {
      $window.location.href = uiChrome.getBasePath() + kbnBaseUrl;
    };

    // keep trying to load data in the background
    const accessPoller = $interval(() => tryPrivilege($http, kbnUrl), 5 * 1000); // every 5 seconds
    $scope.$on('$destroy', () => $interval.cancel(accessPoller));
  },
});
