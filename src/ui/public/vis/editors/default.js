import _ from 'lodash';
import angular from 'angular';
import defaultEditorTemplate from './default.html';

const defaultEditor = function ($rootScope, $compile) {
  return {
    name: 'default',
    render: (vis, element, uiState, visData) => {
      let $scope;

      const updateScope = function () {
        $scope.vis = vis;
        $scope.visData = visData;
        $scope.uiState = uiState;
      };

      if (!this.$scope) {
        this.$scope = $scope = $rootScope.$new();

        updateScope();

        // track state of editable vis vs. "actual" vis
        $scope.stageEditableVis = () => {
          $scope.vis.updateState();
          $scope.vis.dirty = false;
        };
        $scope.resetEditableVis = () => {
          $scope.vis.resetState();
          $scope.vis.dirty = false;
        };

        $scope.$watch(function () {
          return $scope.vis.getCurrentState(false);
        }, function (newState) {
          $scope.vis.dirty = !angular.equals(newState, $scope.vis.getEnabledState());

          $scope.responseValueAggs = null;
          try {
            $scope.responseValueAggs = $scope.vis.aggs.getResponseAggs().filter(function (agg) {
              return _.get(agg, 'schema.group') === 'metrics';
            });
          }
            // this can fail when the agg.type is changed but the
            // params have not been set yet. watcher will trigger again
            // when the params update
          catch (e) {} // eslint-disable-line no-empty
        }, true);

        element.html($compile(defaultEditorTemplate)($scope));
      } else {
        $scope = this.$scope;
        updateScope();
      }

      $scope.$broadcast('render');
    },
    destroy: () => {
      if (this.$scope) {
        this.$scope.$destroy();
        this.$scope = null;
      }
    },
    resize: () => {}
  };
};

export { defaultEditor };
