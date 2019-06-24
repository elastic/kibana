/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import template from './nav_menu.html';
import { isFullLicense } from '../../license/check_license';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import 'ui/directives/kbn_href';

module.directive('mlNavMenu', function () {
  return {
    restrict: 'E',
    transclude: true,
    template,
    link: function (scope, el, attrs) {

      // Tabs
      scope.name = attrs.name;

      scope.showTabs = false;
      if (scope.name === 'jobs' ||
        scope.name === 'settings' ||
        scope.name === 'data_frame' ||
        scope.name === 'datavisualizer' ||
        scope.name === 'filedatavisualizer' ||
        scope.name === 'timeseriesexplorer' ||
        scope.name === 'access-denied' ||
        scope.name === 'explorer') {
        scope.showTabs = true;
      }
      scope.isActiveTab = function (path) {
        return scope.name === path;
      };

      scope.disableLinks = (isFullLicense() === false);
    }
  };
});
