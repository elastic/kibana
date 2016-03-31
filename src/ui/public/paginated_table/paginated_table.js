import _ from 'lodash';

import uiModules from 'ui/modules';
import paginatedTableTemplate from 'ui/paginated_table/paginated_table.html';
uiModules
.get('kibana')
.directive('paginatedTable', function ($filter) {
  var orderBy = $filter('orderBy');

  return {
    restrict: 'E',
    template: paginatedTableTemplate,
    transclude: true,
    scope: {
      rows: '=',
      columns: '=',
      perPage: '=?',
      sortHandler: '=?',
      sort: '=?',
      showSelector: '=?'
    },
    controllerAs: 'paginatedTable',
    controller: function ($scope) {
      var self = this;
      self.sort = {
        columnIndex: null,
        direction: null
      };

      self.sortColumn = function (colIndex) {
        var col = $scope.columns[colIndex];

        if (!col) return;
        if (col.sortable === false) return;

        let sortDirection;

        if (self.sort.columnIndex !== colIndex) {
          sortDirection = 'asc';
        } else {
          var directions = {
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
        self._setSortGetter(colIndex);
      };

      self._setSortGetter = function (index) {
        if (_.isFunction($scope.sortHandler)) {
          // use custom sort handler
          self.sort.getter = $scope.sortHandler(index);
        } else {
          // use generic sort handler
          self.sort.getter = function (row) {
            var value = row[index];
            if (value && value.value != null) value = value.value;
            if (typeof value === 'boolean') value = value ? 0 : 1;
            return value;
          };
        }
      };

      // Set the sort state if it is set
      if ($scope.sort && $scope.sort.columnIndex !== null) {
        self.sortColumn($scope.sort.columnIndex, $scope.sort.direction);
      }
      function resortRows() {
        if (!$scope.rows || !$scope.columns) {
          $scope.sortedRows = false;
          return;
        }

        var sort = self.sort;
        if (sort.direction == null) {
          $scope.sortedRows = $scope.rows.slice(0);
        } else {
          $scope.sortedRows = orderBy($scope.rows, sort.getter, sort.direction === 'desc');
        }
      }

      $scope.$watchCollection('sort', function (newSort) {
        if (newSort && !_.isEqual(newSort, self.sort)) {
          self.sortColumn(newSort.columnIndex, newSort.direction);
          resortRows();
        }
      });

      // update the sordedRows result
      $scope.$watchMulti([
        'rows',
        'columns',
        '[]paginatedTable.sort'
      ], resortRows);
    }
  };
});
