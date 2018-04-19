import './agg_params';
import './agg_add';
import { Direction } from './keyboard_move';
import _ from 'lodash';
import { uiModules } from '../../../modules';
import aggTemplate from './agg.html';
import { move } from '../../../utils/collection';

uiModules
  .get('app/visualize')
  .directive('visEditorAgg', function ($compile, $parse, $filter, Private, Notifier) {
    const notify = new Notifier({
      location: 'visAggGroup'
    });

    return {
      restrict: 'A',
      template: aggTemplate,
      require: 'form',
      link: function ($scope, $el, attrs, kbnForm) {
        $scope.editorOpen = !!$scope.agg.brandNew;

        $scope.$watch('editorOpen', function (open) {
        // make sure that all of the form inputs are "touched"
        // so that their errors propogate
          if (!open) kbnForm.$setTouched();
        });

        $scope.$watchMulti([
          '$index',
          'group.length'
        ], function () {
          $scope.aggIsTooLow = calcAggIsTooLow();
        });

        /**
       * Describe the aggregation, for display in the collapsed agg header
       * @return {[type]} [description]
       */
        $scope.describe = function () {
          if (!$scope.agg.type.makeLabel) return '';
          const label = $scope.agg.type.makeLabel($scope.agg);
          return label ? label : '';
        };

        $scope.$on('drag-start', () => {
          $scope.editorWasOpen = $scope.editorOpen;
          $scope.editorOpen = false;
          $scope.$emit('agg-drag-start', $scope.agg);
        });

        $scope.$on('drag-end', () => {
          $scope.editorOpen = $scope.editorWasOpen;
          $scope.$emit('agg-drag-end', $scope.agg);
        });

        /**
       * Move aggregations down/up in the priority list by pressing arrow keys.
       */
        $scope.onPriorityReorder = function (direction) {
          const positionOffset = direction === Direction.down ? 1 : -1;

          const currentPosition = $scope.group.indexOf($scope.agg);
          const newPosition = Math.max(0, Math.min(currentPosition + positionOffset, $scope.group.length - 1));
          move($scope.group, currentPosition, newPosition);
          $scope.$emit('agg-reorder');
        };

        $scope.remove = function (agg) {
          const aggs = $scope.vis.aggs;

          const index = aggs.indexOf(agg);
          if (index === -1) return notify.log('already removed');

          aggs.splice(index, 1);
        };

        $scope.canRemove = function (aggregation) {
          const metricCount = _.reduce($scope.group, function (count, agg) {
            return (agg.schema.name === aggregation.schema.name) ? ++count : count;
          }, 0);

          // make sure the the number of these aggs is above the min
          return metricCount > aggregation.schema.min;
        };

        function calcAggIsTooLow() {
          if (!$scope.agg.schema.mustBeFirst) {
            return false;
          }

          const firstDifferentSchema = _.findIndex($scope.group, function (agg) {
            return agg.schema !== $scope.agg.schema;
          });

          if (firstDifferentSchema === -1) {
            return false;
          }

          return $scope.$index > firstDifferentSchema;
        }
      }
    };
  });
