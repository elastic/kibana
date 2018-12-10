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
import './agg';
import './agg_add';

import { uiModules } from '../../../modules';
import aggGroupTemplate from './agg_group.html';
import { move } from '../../../utils/collection';
import { aggGroupNameMaps } from './agg_group_names';

uiModules
  .get('app/visualize')
  .directive('visEditorAggGroup', function () {

    return {
      restrict: 'E',
      template: aggGroupTemplate,
      scope: true,
      link: function ($scope, $el, attr) {
        $scope.groupName = attr.groupName;
        $scope.groupNameLabel = aggGroupNameMaps()[$scope.groupName];
        $scope.$bind('group', 'state.aggs.bySchemaGroup["' + $scope.groupName + '"]');
        $scope.$bind('schemas', 'vis.type.schemas["' + $scope.groupName + '"]');

        $scope.$watchMulti([
          'schemas',
          '[]group'
        ], function () {
          const stats = $scope.stats = {
            min: 0,
            max: 0,
            count: $scope.group ? $scope.group.length : 0
          };

          if (!$scope.schemas) return;

          $scope.schemas.forEach(function (schema) {
            stats.min += schema.min;
            stats.max += schema.max;
            stats.deprecate = schema.deprecate;
          });

          $scope.availableSchema = $scope.schemas.filter(function (schema) {
            const count = _.where($scope.group, { schema }).length;
            if (count < schema.max) return true;
          });
        });

        function reorderFinished() {
        //the aggs have been reordered in [group] and we need
        //to apply that ordering to [vis.aggs]
          const indexOffset = $scope.state.aggs.indexOf($scope.group[0]);
          _.forEach($scope.group, (agg, index) => {
            move($scope.state.aggs, agg, indexOffset + index);
          });
        }

        $scope.$on('agg-reorder', reorderFinished);
        $scope.$on('agg-drag-start', () => $scope.dragging = true);
        $scope.$on('agg-drag-end', () => {
          $scope.dragging = false;
          reorderFinished();
        });
      }
    };

  });
