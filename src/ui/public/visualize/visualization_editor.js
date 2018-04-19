import './spy';
import './visualize.less';
import './visualize_legend';
import { uiModules } from '../modules';
import 'angular-sanitize';
import { VisEditorTypesRegistryProvider } from '../registry/vis_editor_types';
import { getUpdateStatus } from '../vis/update_status';

uiModules
  .get('kibana/directive', ['ngSanitize'])
  .directive('visualizationEditor', function (Private, $timeout) {
    const editorTypes = Private(VisEditorTypesRegistryProvider);

    return {
      restrict: 'E',
      scope: {
        showSpyPanel: '=',
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
        const editor = new Editor(element[0], vis, $scope.showSpyPanel);

        $scope.renderFunction = () => {
          if (!$scope.vis) return;
          editor.render($scope.visData, $scope.searchSource, getUpdateStatus(Editor.requiresUpdateStatus, $scope), $scope.uiState);
        };

        $scope.$on('render', (event) => {
          event.preventDefault();
          $timeout(() => { $scope.renderFunction(); });
        });

        $scope.$on('$destroy', () => {
          editor.destroy();
        });

        if (!vis.initialized) {
          $timeout(() => { $scope.renderFunction(); });
        }
      }
    };
  });
