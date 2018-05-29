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

import { keyMap } from '../utils/key_map';
import { uiModules } from '../modules';

const INVALID = {}; // invalid flag
const FLOATABLE = /^[\d\.e\-\+]+$/i;

const VALIDATION_ERROR = 'numberListRangeAndOrder';
const DIRECTIVE_ATTR = 'kbn-number-list-input';

uiModules
  .get('kibana')
  .directive('kbnNumberListInput', function ($parse) {
    return {
      restrict: 'A',
      require: ['ngModel', '^kbnNumberList'],
      link: function ($scope, $el, attrs, controllers) {
        const ngModelCntr = controllers[0];
        const numberListCntr = controllers[1];

        const $setModel = $parse(attrs.ngModel).assign;
        const $repeater = $el.closest('[ng-repeat]');

        const handlers = {
          up: change(add, 1),
          'shift-up': change(addTenth, 1),

          down: change(add, -1),
          'shift-down': change(addTenth, -1),

          tab: go('next'),
          'shift-tab': go('prev'),

          'shift-enter': numberListCntr.add,

          backspace: removeIfEmpty,
          delete: removeIfEmpty
        };

        function removeIfEmpty(event) {
          if (!ngModelCntr.$viewValue) {
            $get('prev').focus();
            numberListCntr.remove($scope.$index);
            event.preventDefault();
          }

          return false;
        }

        function $get(dir) {
          return $repeater[dir]().find('[' + DIRECTIVE_ATTR + ']');
        }

        function go(dir) {
          return function () {
            const $to = $get(dir);
            if ($to.length) $to.focus();
            else return false;
          };
        }

        function idKey(event) {
          const id = [];
          if (event.ctrlKey) id.push('ctrl');
          if (event.shiftKey) id.push('shift');
          if (event.metaKey) id.push('meta');
          if (event.altKey) id.push('alt');
          id.push(keyMap[event.keyCode] || event.keyCode);
          return id.join('-');
        }

        function add(n, val) {
          return parse(val + n);
        }

        function addTenth(n, val, str) {
          let int = Math.floor(val);
          let dec = parseInt(str.split('.')[1] || 0, 10);
          dec = dec + parseInt(n, 10);

          if (dec < 0 || dec > 9) {
            int += Math.floor(dec / 10);
            if (dec < 0) {
              dec = 10 + (dec % 10);
            } else {
              dec = dec % 10;
            }
          }

          return parse(int + '.' + dec);
        }

        function change(using, mod) {
          return function () {
            const str = String(ngModelCntr.$viewValue);
            const val = parse(str);
            if (val === INVALID) return;

            const next = using(mod, val, str);
            if (next === INVALID) return;

            $el.val(next);
            ngModelCntr.$setViewValue(next);
          };
        }

        function onKeydown(event) {
          const handler = handlers[idKey(event)];
          if (!handler) return;

          if (handler(event) !== false) {
            event.preventDefault();
          }

          $scope.$apply();
        }

        $el.on('keydown', onKeydown);
        $scope.$on('$destroy', function () {
          $el.off('keydown', onKeydown);
        });

        function parse(viewValue) {
          let num = viewValue;

          if (typeof num !== 'number' || isNaN(num)) {
          // parse non-numbers
            num = String(viewValue || 0).trim();
            if (!FLOATABLE.test(num)) return INVALID;

            num = parseFloat(num);
            if (isNaN(num)) return INVALID;
          }

          const range = numberListCntr.range;
          if (!range.within(num)) return INVALID;

          if (numberListCntr.validateAscOrder && $scope.$index > 0) {
            const i = $scope.$index - 1;
            const list = numberListCntr.getList();
            const prev = list[i];
            if (num <= prev) return INVALID;
          }

          return num;
        }

        $scope.$watchMulti([
          '$index',
          {
            fn: $scope.$watchCollection,
            get: function () {
              return numberListCntr.getList();
            }
          }
        ], function () {
          const valid = parse(ngModelCntr.$viewValue) !== INVALID;
          ngModelCntr.$setValidity(VALIDATION_ERROR, valid);
        });

        function validate(then) {
          return function (input) {
            let value = parse(input);
            const valid = value !== INVALID;
            value = valid ? value : input;
            ngModelCntr.$setValidity(VALIDATION_ERROR, valid);
            then && then(input, value);
            return value;
          };
        }

        ngModelCntr.$parsers.push(validate());
        ngModelCntr.$formatters.push(validate(function (input, value) {
          if (input !== value) $setModel($scope, value);
        }));

        if (parse(ngModelCntr.$viewValue) === INVALID) {
          ngModelCntr.$setTouched();
        }
      }
    };
  });

