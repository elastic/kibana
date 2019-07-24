/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('MlSaveStatusModal', function ($scope, $location, $modalInstance, params) {

  $scope.pscope = params.pscope;
  $scope.ui = {
    showTimepicker: false,
  };

  // return to jobs list page and open the datafeed modal for the new job
  $scope.openDatafeed = function () {
    $location.path('jobs');
    $modalInstance.close();
    params.openDatafeed();
  };

  // once the job is saved close modal and return to jobs list
  $scope.close = function () {
    if ($scope.pscope.ui.saveStatus.job === 2) {
      $location.path('jobs');
    }

    $scope.pscope.ui.saveStatus.job = 0;
    $modalInstance.close();
  };

});
