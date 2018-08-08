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

import $ from 'jquery';
import { createColorPalette } from '../../components/color/color_palette';
import { uiModules } from '../../../modules';

uiModules
  .get('kibana')
  .directive('nestingIndicator', function () {
    return {
      restrict: 'E',
      scope: {
        item: '=',
        list: '='
      },
      link: function ($scope, $el) {
        $scope.$watchCollection('list', function () {
          if (!$scope.list || !$scope.item) return;

          const index = $scope.list.indexOf($scope.item);
          const bars = $scope.list.slice(0, index + 1);
          const colors = createColorPalette(bars.length);

          $el.html(bars.map(function (bar, i) {
            return $(document.createElement('span'))
              .css('background-color', colors[i]);
          }));
        });
      }
    };
  });
