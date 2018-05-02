import _ from 'lodash';
import './agg';
import './agg_add';
import './nesting_indicator';

import { uiModules } from '../../../modules';
import aggGroupTemplate from './agg_group.html';
import { move } from '../../../utils/collection';

uiModules
  .get('app/visualize')
  .directive('visEditorAggGroup', function () {

    return {
      restrict: 'E',
      template: aggGroupTemplate,
      scope: true,
      link: function ($scope, $el, attr) {
        $scope.groupName = attr.groupName;
        $scope.$bind('group', 'vis.aggs.bySchemaGroup["' + $scope.groupName + '"]');
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
          const indexOffset = $scope.vis.aggs.indexOf($scope.group[0]);
          _.forEach($scope.group, (agg, index) => {
            move($scope.vis.aggs, agg, indexOffset + index);
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
