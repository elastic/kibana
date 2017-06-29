import 'ui/visualize/spy';
import 'ui/visualize/visualize.less';
import 'ui/visualize/visualize_legend';
import { uiModules } from 'ui/modules';
import 'angular-sanitize';
import { VisEditorTypesRegistryProvider } from 'ui/registry/vis_editor_types';

uiModules
.get('kibana/directive', ['ngSanitize'])
.directive('visualizationEditor', function (Private) {
  const editorTypes = Private(VisEditorTypesRegistryProvider);

  return {
    restrict: 'E',
    require: '?renderCounter',
    scope : {
      vis: '=',
      visData: '=',
      uiState: '=?',
      searchSource: '='
    },
    link: function ($scope, element) {
      // Clone the _vis instance.
      const vis = $scope.vis;
      const Editor = typeof vis.type.editor === 'function' ? vis.type.editor :
        editorTypes.find(editor => editor.key === vis.type.editor);
      const editor = new Editor(element[0], vis);

      const renderFunction = () => {
        if (!$scope.vis) return;
        editor.render($scope.visData, $scope.searchSource).then(() => {
          $scope.$emit('renderComplete');
        });
      };

      $scope.$on('render', (event) => {
        event.preventDefault();
        renderFunction();
      });

      $scope.$on('$destroy', () => {
        editor.destroy();
      });

    }
  };
});
