/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import ReactDOM from 'react-dom';

import { EnableModelPlotCheckbox } from './enable_model_plot_checkbox_view.js';
import { ml } from '../../../../../services/ml_api_service';
import { checkCardinalitySuccess } from '../../../utils/new_job_utils';

import { I18nContext } from 'ui/i18n';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlEnableModelPlotCheckbox', function () {
  return {
    restrict: 'AE',
    replace: false,
    scope: {
      formConfig: '=',
      ui: '=ui',
      getJobFromConfig: '='
    },
    link: function ($scope, $element) {
      const STATUS = {
        FAILED: -1,
        NOT_RUNNING: 0,
        RUNNING: 1,
        FINISHED: 2,
        WARNING: 3,
      };

      function errorHandler(error) {
        console.log('Cardinality could not be validated', error);
        $scope.ui.cardinalityValidator.status = STATUS.FAILED;
        $scope.ui.cardinalityValidator.message =  i18n.translate(
          'xpack.ml.newJob.simple.enableModelPlot.validatingConfigurationErrorMessage', {
            defaultMessage: 'An error occurred validating the configuration ' +
            'for running the job with model plot enabled. ' +
            'Creating model plots can be resource intensive and not recommended where the cardinality of the selected fields is high. ' +
            'You may want to select a dedicated results index on the Job Details tab.'
          });
        // Go ahead and check the dedicated index box for them
        $scope.formConfig.useDedicatedIndex = true;
      }

      function validateCardinality() {
        $scope.ui.cardinalityValidator.status = STATUS.RUNNING;
        $scope.ui.cardinalityValidator.message = '';

        // create temporary job since cardinality validation expects that format
        const tempJob = $scope.getJobFromConfig($scope.formConfig);

        ml.validateCardinality(tempJob)
          .then((response) => {
            const validationResult = checkCardinalitySuccess(response);

            if (validationResult.success === true) {
              $scope.formConfig.enableModelPlot = true;
              $scope.ui.cardinalityValidator.status = STATUS.FINISHED;
            } else {
              $scope.ui.cardinalityValidator.message = i18n.translate('xpack.ml.newJob.simple.enableModelPlot.enableModelPlotDescription', {
                defaultMessage: 'Creating model plots is resource intensive and not recommended ' +
                  'where the cardinality of the selected fields is greater than 100. Estimated cardinality ' +
                  'for this job is {highCardinality}. ' +
                  'If you enable model plot with this configuration we recommend you use a dedicated results index.',
                values: { highCardinality: validationResult.highCardinality }
              });

              $scope.ui.cardinalityValidator.status = STATUS.WARNING;
              // Go ahead and check the dedicated index box for them
              $scope.formConfig.useDedicatedIndex = true;
              // show the advanced section so the warning message is visible since validation failed
              $scope.ui.showAdvanced = true;
            }
          })
          .catch(errorHandler)
          .then(() => {
            $scope.$applyAsync();
          });
      }

      // Re-validate cardinality for updated fields/splitField
      // when enable model plot is checked and form valid
      function revalidateCardinalityOnFieldChange() {
        if ($scope.formConfig.enableModelPlot === true && $scope.ui.formValid === true) {
          validateCardinality();
        }
      }

      $scope.handleCheckboxChange = (isChecked) => {
        if (isChecked) {
          $scope.formConfig.enableModelPlot = true;
          validateCardinality();
        } else {
          $scope.formConfig.enableModelPlot = false;
          $scope.ui.cardinalityValidator.status = STATUS.FINISHED;
          $scope.ui.cardinalityValidator.message = '';
          updateCheckbox();
        }
      };

      // Update checkbox on these changes
      $scope.$watch('ui.formValid', updateCheckbox, true);
      $scope.$watch('ui.cardinalityValidator.status', updateCheckbox, true);
      // MultiMetric: Fire off cardinality validation when fields and/or split by field is updated
      $scope.$watch('formConfig.fields', revalidateCardinalityOnFieldChange, true);
      $scope.$watch('formConfig.splitField', revalidateCardinalityOnFieldChange, true);
      // Population: Fire off cardinality validation when overField is updated
      $scope.$watch('formConfig.overField', revalidateCardinalityOnFieldChange, true);

      function updateCheckbox() {
        // disable if (check is running && checkbox checked) or (form is invalid && checkbox unchecked)
        const checkboxDisabled = (
          ($scope.ui.cardinalityValidator.status === STATUS.RUNNING &&
          $scope.formConfig.enableModelPlot === true) ||
          ($scope.ui.formValid !== true &&
          $scope.formConfig.enableModelPlot === false)
        );
        const validatorRunning = ($scope.ui.cardinalityValidator.status === STATUS.RUNNING);
        const warningStatus = (
          ($scope.ui.cardinalityValidator.status === STATUS.WARNING ||
            $scope.ui.cardinalityValidator.status === STATUS.FAILED) &&
            $scope.ui.formValid === true);
        const checkboxText = (validatorRunning)
          ? i18n.translate('xpack.ml.newJob.simple.enableModelPlot.validatingCardinalityLabel', {
            defaultMessage: 'Validating cardinality…'
          })
          : i18n.translate('xpack.ml.newJob.simple.enableModelPlot.enableModelPlotLabel', {
            defaultMessage: 'Enable model plot'
          });

        const props = {
          checkboxDisabled,
          checkboxText,
          onCheckboxChange: $scope.handleCheckboxChange,
          warningContent: $scope.ui.cardinalityValidator.message,
          warningStatus,
        };

        ReactDOM.render(
          <I18nContext>
            {React.createElement(EnableModelPlotCheckbox, props)}
          </I18nContext>,
          $element[0]
        );
      }

      updateCheckbox();
    }
  };
});
