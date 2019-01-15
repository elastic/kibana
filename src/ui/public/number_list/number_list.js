/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import { parseRange } from '../utils/range';
import './number_list_input';
import { uiModules } from '../modules';
import numberListTemplate from './number_list.html';

uiModules
  .get('kibana')
  .directive('kbnNumberList', function () {
    return {
      restrict: 'E',
      template: numberListTemplate,
      controllerAs: 'numberListCntr',
      require: 'ngModel',
      scope: {
        validateAscendingOrder: '=?',
        labelledbyId: '@',
      },
      controller: function ($scope, $attrs, $parse) {
        const self = this;

        self.labelledbyId = $scope.labelledbyId;

        // Called from the pre-link function once we have the controllers
        self.init = function (modelCntr) {
          self.modelCntr = modelCntr;

          self.getList = function () {
            return self.modelCntr.$modelValue;
          };

          self.getUnitName = _.partial($parse($attrs.unit), $scope);

          const defaultRange = self.range = parseRange('[0,Infinity)');
          self.validateAscOrder = _.isUndefined($scope.validateAscendingOrder) ? true : $scope.validateAscendingOrder;

          $scope.$watch(function () {
            return $attrs.range;
          }, function (range) {
            if (!range) {
              self.range = defaultRange;
              return;
            }

            try {
              self.range = parseRange(range);
            } catch (e) {
              throw new TypeError('Unable to parse range: ' + e.message);
            }
          });

          /**
         * Remove an item from list by index
         * @param  {number} index
         * @return {undefined}
         */
          self.remove = function (index) {
            const list = self.getList();
            if (!list) return;

            list.splice(index, 1);
          };

          /**
         * Add an item to the end of the list
         * @return {undefined}
         */
          self.add = function () {
            const list = self.getList();
            if (!list) return;

            function getNext() {
              if (list.length === 0) {
                // returning NaN adds an empty input
                return NaN;
              }

              const next = _.last(list) + 1;
              if (next < self.range.max) {
                return next;
              }

              return self.range.max - 1;
            }

            const next = getNext();
            list.push(next);
          };

          /**
         * Check to see if the list is too short.
         *
         * @return {Boolean}
         */
          self.tooShort = function () {
            return _.size(self.getList()) < 1;
          };

          /**
         * Check to see if the list is too short, but simply
         * because the user hasn't interacted with it yet
         *
         * @return {Boolean}
         */
          self.undefinedLength = function () {
            return self.tooShort() && (self.modelCntr.$untouched && self.modelCntr.$pristine);
          };

          /**
         * Check to see if the list is too short
         *
         * @return {Boolean}
         */
          self.invalidLength = function () {
            return self.tooShort() && !self.undefinedLength();
          };

          $scope.$watchCollection(self.getList, function () {
            self.modelCntr.$setValidity('numberListLength', !self.tooShort());
          });
        };
      },
      link: {
        pre: function ($scope, $el, attrs, ngModelCntr) {
          $scope.numberListCntr.init(ngModelCntr);
        }
      },
    };
  });
