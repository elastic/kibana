import 'ui/visualize/spy';
import 'ui/visualize/visualize.less';
import 'ui/visualize/visualize_legend';
import _ from 'lodash';
import angular from 'angular';
import { uiModules } from 'ui/modules';
import 'angular-sanitize';
import { EditorTypesRegistyProvider } from 'ui/registry/editor_types';

uiModules
.get('kibana/directive', ['ngSanitize'])
.directive('visualizationEditor', function (Private, $compile) {
  const editorTypes = Private(EditorTypesRegistyProvider);

  return {
    restrict: 'E',
    require: '?renderCounter',
    scope : {
      vis: '=',
      visData: '=',
      uiState: '=?',
      appState: '='
    },
    link: function ($scope, element) {
      // Clone the _vis instance.
      const vis = $scope.vis;
      const editableVis = $scope.editableVis = vis.clone();
      const editor = typeof vis.type.editorController === 'function' ? vis.type.editorController :
        editorTypes.find(editor => editor.name === vis.type.editorController).render;
      element.html($compile(editor())($scope));

      // We intend to keep editableVis and vis in sync with one another, so calling `requesting` on
      // vis should call it on both.
      vis.requesting = function () {
        const requesting = editableVis.requesting;
        // Invoking requesting() calls onRequest on each agg's type param. When a vis is marked as being
        // requested, the bounds of that vis are updated and new data is fetched using the new bounds.
        requesting.call(vis);

        // We need to keep editableVis in sync with vis.
        requesting.call(editableVis);
      };

      // track state of editable vis vs. "actual" vis
      $scope.stageEditableVis = transferVisState(editableVis, vis, true);
      $scope.resetEditableVis = transferVisState(vis, editableVis);
      $scope.$watch(function () {
        return editableVis.getEnabledState();
      }, function (newState) {
        editableVis.dirty = !angular.equals(newState, vis.getEnabledState());

        $scope.responseValueAggs = null;
        try {
          $scope.responseValueAggs = editableVis.aggs.getResponseAggs().filter(function (agg) {
            return _.get(agg, 'schema.group') === 'metrics';
          });
        }
          // this can fail when the agg.type is changed but the
          // params have not been set yet. watcher will trigger again
          // when the params update
        catch (e) {} // eslint-disable-line no-empty
      }, true);

      function transferVisState(fromVis, toVis, stage) {
        return function () {
          const view = fromVis.getEnabledState();
          const viewTo = toVis.getEnabledState();
          view.listeners = viewTo.listeners;
          const full = fromVis.getState();
          toVis.setState(view);
          editableVis.dirty = false;
          $scope.appState.vis = full;
          if (stage) {
            $scope.appState.save();
          }
        };
      }
    }
  };
});
