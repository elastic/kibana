import './sidebar';
import './vis_options';
import $ from 'jquery';

import _ from 'lodash';
import angular from 'angular';
import defaultEditorTemplate from './default.html';

import { VisEditorTypesRegistryProvider } from 'ui/registry/vis_editor_types';

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

    render(visData, searchSource) {
      let $scope;

      const updateScope = () => {
        $scope.showSpyPanel = this.showSpyPanel;
        $scope.vis = this.vis;
        $scope.visData = visData;
        $scope.uiState = this.vis.getUiState();
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

          $scope.$on('renderComplete', () => {
            $scope.renderComplete();
          });

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

          this.el.html($compile(defaultEditorTemplate)($scope));
        } else {
          $scope = this.$scope;
          updateScope();
        }

        $scope.renderComplete = resolve;
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
