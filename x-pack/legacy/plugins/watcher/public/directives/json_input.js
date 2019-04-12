/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import angular from 'angular';
import { uiModules } from 'ui/modules';

uiModules
  .get('xpack/watcher')
  .directive('jsonInput', function () {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function (scope, $el, attrs, ngModelCntrl) {
        ngModelCntrl.$formatters.push(toJSON);
        ngModelCntrl.$parsers.push(fromJSON);

        function fromJSON(value) {
          try {
            value = JSON.parse(value);
            const validity = !scope.$eval(attrs.requireKeys) ? true : _.keys(value).length > 0;
            ngModelCntrl.$setValidity('json', validity);
          } catch (e) {
            ngModelCntrl.$setValidity('json', false);
          }
          return value;
        }

        function toJSON(value) {
          return angular.toJson(value, 2);
        }
      }
    };
  });

