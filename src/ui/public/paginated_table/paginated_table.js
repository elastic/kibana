define(function (require) {
  require('ui/modules')
  .get('kibana')
  .directive('paginatedTable', function ($filter) {
    let _ = require('lodash');
    let orderBy = $filter('orderBy');

    return {
      restrict: 'E',
      template: require('ui/paginated_table/paginated_table.html'),
      transclude: true,
      scope: {
        rows: '=',
        columns: '=',
        perPage: '=?',
        sortHandler: '=?',
        showSelector: '=?'
      },
      controllerAs: 'paginatedTable',
      controller: function ($scope) {
        let self = this;
        self.sort = {
          columnIndex: null,
          direction: null
        };

        self.sortColumn = function (colIndex) {
          let col = $scope.columns[colIndex];

          if (!col) return;
          if (col.sortable === false) return;

          let sortDirection;

          if (self.sort.columnIndex !== colIndex) {
            sortDirection = 'asc';
          } else {
            let directions = {
              null: 'asc',
              'asc': 'desc',
              'desc': null
            };
            sortDirection = directions[self.sort.direction];
          }

          self.sort.columnIndex = colIndex;
          self.sort.direction = sortDirection;
          self._setSortGetter(colIndex);
        };

        self._setSortGetter = function (index) {
          if (_.isFunction($scope.sortHandler)) {
            // use custom sort handler
            self.sort.getter = $scope.sortHandler(index);
          } else {
            // use generic sort handler
            self.sort.getter = function (row) {
              let value = row[index];
              if (value && value.value != null) return value.value;
              return value;
            };
          }
        };

        // update the sordedRows result
        $scope.$watchMulti([
          'rows',
          'columns',
          '[]paginatedTable.sort'
        ], function resortRows() {
          if (!$scope.rows || !$scope.columns) {
            $scope.sortedRows = false;
            return;
          }

          let sort = self.sort;
          if (sort.direction == null) {
            $scope.sortedRows = $scope.rows.slice(0);
          } else {
            $scope.sortedRows = orderBy($scope.rows, sort.getter, sort.direction === 'desc');
          }
        });
      }
    };
  });
});
