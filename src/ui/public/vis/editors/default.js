import _ from 'lodash';
import angular from 'angular';
import defaultEditorTemplate from './default.html';

const defaultEditor = function ($rootScope, $compile) {
  return {
    name: 'default',
    render: (vis, element, uiState, visData, $scope) => {
      //const $scope = $rootScope.$new();
      /*$scope.vis = vis;
      $scope.visData = visData;
      $scope.uiState = uiState;*/

      // track state of editable vis vs. "actual" vis
      $scope.stageEditableVis = () => {
        vis.updateState();
        vis.dirty = false;
      };
      $scope.resetEditableVis = () => {
        vis.resetState();
        vis.dirty = false;
      };

      $scope.$watch(function () {
        return vis.getCurrentState(false);
      }, function (newState) {
        vis.dirty = !angular.equals(newState, vis.getEnabledState());

        $scope.responseValueAggs = null;
        try {
          $scope.responseValueAggs = vis.aggs.getResponseAggs().filter(function (agg) {
            return _.get(agg, 'schema.group') === 'metrics';
          });
        }
          // this can fail when the agg.type is changed but the
          // params have not been set yet. watcher will trigger again
          // when the params update
        catch (e) {} // eslint-disable-line no-empty
      }, true);

      element.html($compile(defaultEditorTemplate)($scope));
    }
  };
};

export { defaultEditor };
