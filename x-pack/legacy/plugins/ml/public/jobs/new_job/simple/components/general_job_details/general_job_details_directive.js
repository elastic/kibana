/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import template from './general_job_details.html';
import { i18n } from '@kbn/i18n';
import { changeJobIDCase } from './change_job_id_case';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlGeneralJobDetails', function () {
  return {
    restrict: 'E',
    replace: true,
    template,
    controller: function ($scope) {
      // force job ids to be lowercase
      $scope.changeJobIDCase = changeJobIDCase;
      $scope.hideAdvancedButtonAriaLabel = i18n.translate('xpack.ml.newJob.simple.generalJobDetails.hideAdvancedButtonAriaLabel', {
        defaultMessage: 'Hide Advanced'
      });
      $scope.showAdvancedButtonAriaLabel = i18n.translate('xpack.ml.newJob.simple.generalJobDetails.showAdvancedButtonAriaLabel', {
        defaultMessage: 'Show Advanced'
      });
      $scope.enterNameForJobLabel = i18n.translate('xpack.ml.newJob.simple.generalJobDetails.enterNameForJobLabel', {
        defaultMessage: 'Enter a name for the job'
      });
    }
  };
});
