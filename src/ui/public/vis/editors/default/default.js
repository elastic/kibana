import './sidebar';
import './vis_options';
import './vis_editor_resizer';
import $ from 'jquery';

import _ from 'lodash';
import angular from 'angular';
import defaultEditorTemplate from './default.html';
import { keyCodes } from '@elastic/eui';
import { DefaultEditorSize } from '../../editor_size';

import { VisEditorTypesRegistryProvider } from '../../../registry/vis_editor_types';

const defaultEditor = function ($rootScope, $compile) {
  return class DefaultEditor {
    static key = 'default';

    constructor(el, vis, showSpyPanel) {
      this.el = $(el);
      this.vis = vis;
      this.showSpyPanel = showSpyPanel;

      if (!this.vis.type.editorConfig.optionTabs && this.vis.type.editorConfig.optionsTemplate) {
        this.vis.type.editorConfig.optionTabs = [
          { name: 'options', title: 'Options', editor: this.vis.type.editorConfig.optionsTemplate }
        ];
      }
    }

    render(visData, searchSource, updateStatus, uiState) {
      let $scope;

      const updateScope = () => {
        $scope.showSpyPanel = this.showSpyPanel;
        $scope.vis = this.vis;
        $scope.visData = visData;
        $scope.uiState = uiState;
        $scope.searchSource = searchSource;
        $scope.$apply();
      };

      return new Promise(resolve => {
        if (!this.$scope) {
          this.$scope = $scope = $rootScope.$new();

          updateScope();

          $scope.toggleSidebar = () => {
            $scope.$broadcast('render');
          };

          this.el.one('renderComplete', resolve);

          // track state of editable vis vs. "actual" vis
          $scope.stageEditableVis = () => {
            $scope.vis.updateState();
            $scope.vis.dirty = false;
          };
          $scope.resetEditableVis = () => {
            $scope.vis.resetState();
            $scope.vis.dirty = false;
          };

          $scope.autoApplyEnabled = false;
          if ($scope.vis.type.editorConfig.enableAutoApply) {
            $scope.toggleAutoApply = () => {
              $scope.autoApplyEnabled = !$scope.autoApplyEnabled;
            };

            $scope.$watch('vis.dirty', _.debounce(() => {
              if (!$scope.autoApplyEnabled || !$scope.vis.dirty) return;
              $scope.stageEditableVis();
            }, 800));
          }

          $scope.submitEditorWithKeyboard = (event) => {
            if (event.ctrlKey && event.keyCode === keyCodes.ENTER) {
              event.preventDefault();
              event.stopPropagation();
              $scope.stageEditableVis();
            }
          };

          $scope.getSidebarClass = () => {
            if ($scope.vis.type.editorConfig.defaultSize === DefaultEditorSize.SMALL) {
              return 'collapsible-sidebar--small';
            } else if ($scope.vis.type.editorConfig.defaultSize === DefaultEditorSize.MEDIUM) {
              return 'collapsible-sidebar--medium';
            } else if ($scope.vis.type.editorConfig.defaultSize === DefaultEditorSize.LARGE) {
              return 'collapsible-sidebar--large';
            }
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

          // Load the default editor template, attach it to the DOM and compile it.
          // It should be added to the DOM before compiling, to prevent some resize
          // listener issues.
          const template = $(defaultEditorTemplate);
          this.el.html(template);
          $compile(template)($scope);
        } else {
          $scope = this.$scope;
          updateScope();
        }

        $scope.$broadcast('render');
      });
    }

    resize() {

    }

    destroy() {
      if (this.$scope) {
        this.$scope.$destroy();
        this.$scope = null;
      }
    }
  };
};

VisEditorTypesRegistryProvider.register(defaultEditor);

export { defaultEditor };
