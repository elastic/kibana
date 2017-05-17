import _ from 'lodash';
import 'ui/visualize/spy';
import 'ui/visualize/visualize.less';
import 'ui/visualize/visualize_legend';
import { uiModules } from 'ui/modules';
import 'angular-sanitize';
import { EditorTypesRegistryProvider } from 'ui/registry/editor_types';

uiModules
.get('kibana/directive', ['ngSanitize'])
.directive('visualizationEditor', function (Private) {
  const editorTypes = Private(EditorTypesRegistryProvider);

  return {
    restrict: 'E',
    require: '?renderCounter',
    scope : {
      vis: '=',
      visData: '=',
      uiState: '=?'
    },
    link: function ($scope, element) {
      // Clone the _vis instance.
      const vis = $scope.vis;
      const editor = typeof vis.type.editorController === 'function' ? vis.type.editorController :
        editorTypes.find(editor => editor.name === vis.type.editorController).render;

      const renderFunction = _.debounce(() => {
        editor(vis, element, $scope.visState, $scope.visData, $scope);
        $scope.$apply();
      }, 200);

      $scope.$on('render', () => {
        if (!$scope.vis) {
          return;
        }
        renderFunction();
      });

    }
  };
});
