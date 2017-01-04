import uiModules from 'ui/modules';
import template from './view.html';
import { compact, map, trim } from 'lodash';

const app = uiModules.get('kibana');

app.directive('listTextarea', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      list: '=',
      splitOnComma: '@'
    },
    controller: function ($scope) {
      $scope.splitOnComma = !!$scope.splitOnComma;

      function splitValues(delimitedList) {
        return delimitedList.split('\n');
      }

      function joinValues(valueArray) {
        return valueArray.join('\n');
      }

      function updateList() {
        let valuesString = $scope.values;
        if ($scope.splitOnComma) {
          valuesString = valuesString.replace(/,/g, '\n');
        }

        let list = splitValues(valuesString);
        list = compact(list);
        list = map(list, value => trim(value));

        $scope.list = list;
        $scope.values = joinValues($scope.list);
      }

      $scope.values = joinValues($scope.list);

      $scope.$watch('values', updateList);
    }
  };
});
