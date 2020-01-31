/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import template from './loading_indicator.html';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlLoadingIndicator', function() {
  return {
    restrict: 'E',
    template,
    transclude: true,
    scope: {
      label: '@?',
      isLoading: '<',
      height: '<?',
    },
    link: function(scope) {
      scope.height = scope.height ? +scope.height : 100;
    },
  };
});
