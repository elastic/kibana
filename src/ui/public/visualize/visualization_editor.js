import _ from 'lodash';
import 'ui/visualize/spy';
import 'ui/visualize/visualize.less';
import 'ui/visualize/visualize_legend';
import { uiModules } from 'ui/modules';
import 'angular-sanitize';
import { EditorTypesRegistryProvider } from 'ui/registry/editor_types';
import { ResizeCheckerProvider } from 'ui/resize_checker';

uiModules
.get('kibana/directive', ['ngSanitize'])
.directive('visualizationEditor', function (Private) {
  const editorTypes = Private(EditorTypesRegistryProvider);
  const ResizeChecker = Private(ResizeCheckerProvider);

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
      const resizeChecker = new ResizeChecker(element);
      const Editor = typeof vis.type.editor === 'function' ? vis.type.editor :
        editorTypes.find(editor => editor.key === vis.type.editor);
      const editor = new Editor(element[0], vis);

      const renderFunction = _.debounce(() => {
        editor.render($scope.visData, $scope.searchSource).then(() => {
          $scope.$emit('renderComplete');
          $scope.$apply();
        });
      }, 200);

      $scope.$on('render', () => {
        if (!$scope.vis) {
          return;
        }
        renderFunction();
      });

      resizeChecker.on('resize', () => {
        editor.resize();
      });

      $scope.$on('$destroy', () => {
        editor.destroy();
      });

    }
  };
});
