/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import template from './bucket_span_selection.html';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlBucketSpanSelection', function () {
  return {
    restrict: 'E',
    replace: true,
    template,
    controller: function ($scope) {

      $scope.bucketSpanFieldChange = function () {
        $scope.ui.bucketSpanEstimator.status = 0;
        $scope.ui.bucketSpanEstimator.message = '';
        $scope.formChange();
      };

      // this is passed into the bucketspan estimator and  reference to the guessBucketSpan function is inserted
      // to allow it for be called automatically without user interaction.
      $scope.bucketSpanEstimatorExportedFunctions = {};
    }
  };
});
