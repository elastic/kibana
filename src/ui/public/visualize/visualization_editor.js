import 'ui/visualize/spy';
import 'ui/visualize/visualize.less';
import 'ui/visualize/visualize_legend';
import { uiModules } from 'ui/modules';
import 'angular-sanitize';
import { EditorTypesRegistyProvider } from 'ui/registry/editor_types';

uiModules
.get('kibana/directive', ['ngSanitize'])
.directive('visualizationEditor', function (Private) {
  const editorTypes = Private(EditorTypesRegistyProvider);

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

      editor(vis, element, $scope.visState, $scope.visData, $scope);


    }
  };
});
