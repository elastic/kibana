/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// directive for displaying detectors form list.

import angular from 'angular';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import 'plugins/ml/jobs/new_job/advanced/detector_modal';
import 'plugins/ml/jobs/new_job/advanced/detector_filter_modal';
import { detectorToString } from 'plugins/ml/util/string_utils';
import template from './detectors_list.html';
import detectorModalTemplate from 'plugins/ml/jobs/new_job/advanced/detector_modal/detector_modal.html';
import detectorFilterModalTemplate from 'plugins/ml/jobs/new_job/advanced/detector_filter_modal/detector_filter_modal.html';
import { mlJobService } from 'plugins/ml/services/job_service';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlJobDetectorsList', function ($modal) {
  return {
    restrict: 'AE',
    replace: true,
    scope: {
      detectors: '=mlDetectors',
      indices: '=mlIndices',
      fields: '=mlFields',
      catFieldNameSelected: '=mlCatFieldNameSelected',
      editMode: '=mlEditMode',
      onUpdate: '=mlOnDetectorsUpdate'
    },
    template,
    controller: function ($scope) {

      $scope.addDetector = function (dtr, index) {
        if (dtr !== undefined) {
          if (index >= 0) {
            $scope.detectors[index] = dtr;
          } else {
            $scope.detectors.push(dtr);
          }

          $scope.onUpdate();
        }
      };

      $scope.removeDetector = function (index) {
        $scope.detectors.splice(index, 1);
        $scope.onUpdate();
      };

      $scope.editDetector = function (index) {
        $scope.openNewWindow(index);
      };

      $scope.info = function () {

      };

      // add a filter to the detector
      // called from inside the filter modal
      $scope.addFilter = function (dtr, filter, filterIndex) {
        if (dtr.rules === undefined) {
          dtr.rules = [];
        }

        if (filterIndex >= 0) {
          dtr.rules[filterIndex] = filter;
        } else {
          dtr.rules.push(filter);
        }
      };

      $scope.removeFilter = function (detector, filterIndex) {
        detector.rules.splice(filterIndex, 1);
      };

      $scope.editFilter = function (detector, index) {
        $scope.openFilterWindow(detector, index);
      };


      $scope.detectorToString = detectorToString;

      function validateDetector(dtr) {

        // locally check exclude_frequent as it can only be 'true', 'false', 'by' or 'over'
        if (dtr.exclude_frequent !== undefined && dtr.exclude_frequent !== '') {
          const exFrqs = ['all', 'none', 'by', 'over'];
          if (_.indexOf(exFrqs, dtr.exclude_frequent.trim()) === -1) {
            // return a pretend promise
            return {
              then: function (callback) {
                callback({
                  success: false,
                  message: i18n.translate('xpack.ml.newJob.advanced.detectorsList.invalidExcludeFrequentParameterErrorMessage', {
                    defaultMessage: '{excludeFrequentParam} value must be: {allValue}, {noneValue}, {byValue} or {overValue}',
                    values: {
                      excludeFrequentParam: 'exclude_frequent',
                      allValue: '"all"',
                      noneValue: '"none"',
                      byValue: '"by"',
                      overValue: '"over"'
                    }
                  })
                });
              }
            };
          }
        }

        // post detector to server for in depth validation
        return mlJobService.validateDetector(dtr)
          .then((resp) => {
            return {
              success: (resp.acknowledged || false)
            };
          })
          .catch((resp) => {
            return {
              success: false,
              message: (
                resp.message || i18n.translate('xpack.ml.newJob.advanced.detectorsList.validationFailedErrorMessage', {
                  defaultMessage: 'Validation failed'
                })
              )
            };
          });
      }

      $scope.openNewWindow = function (index) {
        index = (index !== undefined ? index : -1);
        let dtr;
        if (index >= 0) {
          dtr = angular.copy($scope.detectors[index]);
        }
        $modal.open({
          template: detectorModalTemplate,
          controller: 'MlDetectorModal',
          backdrop: 'static',
          keyboard: false,
          size: 'lg',
          resolve: {
            params: function () {
              return {
                fields: $scope.fields,
                validate: validateDetector,
                detector: dtr,
                index: index,
                add: $scope.addDetector,
                catFieldNameSelected: $scope.catFieldNameSelected
              };
            }
          }
        });
      };

      $scope.openFilterWindow = function (dtr, filterIndex) {
        filterIndex = (filterIndex !== undefined ? filterIndex : -1);
        let filter;
        if (filterIndex >= 0) {
          filter = angular.copy(dtr.rules[filterIndex]);
        }
        $modal.open({
          template: detectorFilterModalTemplate,
          controller: 'MlDetectorFilterModal',
          backdrop: 'static',
          keyboard: false,
          size: 'lg',
          resolve: {
            params: function () {
              return {
                fields: $scope.fields,
                validate: validateDetector,
                detector: dtr,
                filter: filter,
                index: filterIndex,
                add: $scope.addFilter
              };
            }
          }
        });
      };
    }
  };
});
