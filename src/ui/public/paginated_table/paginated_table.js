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
import AggConfigResult from '../vis/agg_config_result';

import { uiModules } from '../modules';
import paginatedTableTemplate from './paginated_table.html';
uiModules
  .get('kibana')
  .directive('paginatedTable', function ($filter) {
    const orderBy = $filter('orderBy');

    return {
      restrict: 'E',
      template: paginatedTableTemplate,
      transclude: true,
      scope: {
        rows: '=',
        columns: '=',
        linkToTop: '=',
        perPage: '=?',
        showBlankRows: '=?',
        sortHandler: '=?',
        sort: '=?',
        showSelector: '=?',
        showTotal: '=',
        totalFunc: '='
      },
      controllerAs: 'paginatedTable',
      controller: function ($scope) {
        const self = this;
        self.sort = {
          columnIndex: null,
          direction: null
        };

        self.sortColumn = function (colIndex, sortDirection = 'asc') {
          const col = $scope.columns[colIndex];

          if (!col) return;
          if (col.sortable === false) return;

          if (self.sort.columnIndex === colIndex) {
            const directions = {
              null: 'asc',
              'asc': 'desc',
              'desc': null
            };
            sortDirection = directions[self.sort.direction];
          }

          self.sort.columnIndex = colIndex;
          self.sort.direction = sortDirection;
          if ($scope.sort) {
            _.assign($scope.sort, self.sort);
          }
        };

        self.rowsToShow = function (numRowsPerPage, actualNumRowsOnThisPage) {
          if ($scope.showBlankRows === false) {
            return actualNumRowsOnThisPage;
          } else {
            return numRowsPerPage;
          }
        };

        function valueGetter(row) {
          let value = row[self.sort.columnIndex];
          if (value && value.value != null) value = value.value;
          if (typeof value === 'boolean') value = value ? 0 : 1;
          if (value instanceof AggConfigResult && value.valueOf() === null) value = false;
          return value;
        }

        // Set the sort state if it is set
        if ($scope.sort && $scope.sort.columnIndex !== null) {
          self.sortColumn($scope.sort.columnIndex, $scope.sort.direction);
        }
        function resortRows() {
          const newSort = $scope.sort;
          if (newSort && !_.isEqual(newSort, self.sort)) {
            self.sortColumn(newSort.columnIndex, newSort.direction);
          }

          if (!$scope.rows || !$scope.columns) {
            $scope.sortedRows = false;
            return;
          }

          const sort = self.sort;
          if (sort.direction == null) {
            $scope.sortedRows = $scope.rows.slice(0);
          } else {
            $scope.sortedRows = orderBy($scope.rows, valueGetter, sort.direction === 'desc');
          }
        }


        // update the sortedRows result
        $scope.$watchMulti([
          'rows',
          'columns',
          '[]sort',
          '[]paginatedTable.sort'
        ], resortRows);
      }
    };
  });
