/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import './sidebar';
import './vis_options';
import './vis_editor_resizer';
import './vis_type_agg_filter';
import $ from 'jquery';

import _ from 'lodash';
import angular from 'angular';
import defaultEditorTemplate from './default.html';
import { keyCodes } from '@elastic/eui';
import { DefaultEditorSize } from '../../editor_size';

import { VisEditorTypesRegistryProvider } from '../../../registry/vis_editor_types';
import { getVisualizeLoader } from '../../../visualize/loader/visualize_loader';
import { updateEditorStateWithChanges } from './update_editor_state';


const defaultEditor = function ($rootScope, $compile) {
  return class DefaultEditor {
    static key = 'default';

    constructor(el, savedObj) {
      this.el = $(el);
      this.savedObj = savedObj;
      this.vis = savedObj.vis;

      if (!this.vis.type.editorConfig.optionTabs && this.vis.type.editorConfig.optionsTemplate) {
        this.vis.type.editorConfig.optionTabs = [
          { name: 'options', title: 'Options', editor: this.vis.type.editorConfig.optionsTemplate }
        ];
      }
    }

    render({ uiState, timeRange, appState }) {
      let $scope;

      const updateScope = () => {
        $scope.vis = this.vis;
        $scope.uiState = uiState;
        //$scope.$apply();
      };

      return new Promise(resolve => {
        if (!this.$scope) {
          this.$scope = $scope = $rootScope.$new();

          updateScope();

          $scope.state = $scope.vis.copyCurrentState(true);
          $scope.oldState = $scope.vis.getSerializableState($scope.state);

          $scope.toggleSidebar = () => {
            $scope.$broadcast('render');
          };

          this.el.one('renderComplete', resolve);
          // track state of editable vis vs. "actual" vis
          $scope.stageEditableVis = () => {
            $scope.oldState = $scope.vis.getSerializableState($scope.state);
            $scope.vis.setCurrentState($scope.state);
            $scope.vis.updateState();
            $scope.vis.dirty = false;
          };
          $scope.resetEditableVis = () => {
            $scope.state = $scope.vis.copyCurrentState(true);
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

          let lockDirty = false;
          $scope.$watch(() => {
            return $scope.vis.getSerializableState($scope.state);
          }, function (newState) {
            // when visualization updates its `vis.params` we need to update the editor, but we should
            // not set the dirty flag (as this change came from vis itself and is already applied)
            if (lockDirty) {
              lockDirty = false;
            } else {
              $scope.vis.dirty = !angular.equals(newState, $scope.oldState);
            }

            $scope.responseValueAggs = null;
            try {
              $scope.responseValueAggs = $scope.state.aggs.getResponseAggs().filter(function (agg) {
                return _.get(agg, 'schema.group') === 'metrics';
              });
            }
            // this can fail when the agg.type is changed but the
            // params have not been set yet. watcher will trigger again
            // when the params update
            catch (e) {} // eslint-disable-line no-empty
          }, true);

          // fires when visualization state changes, and we need to copy changes to editorState
          $scope.$watch(() => {
            return $scope.vis.getCurrentState(false);
          }, (newState) => {
            if (updateEditorStateWithChanges(newState, $scope.oldState, $scope.state)) {
              lockDirty = true;
            }
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

        if (!this._handler) {
          const visualizationEl = this.el.find('.vis-editor-canvas')[0];
          getVisualizeLoader().then(loader => {
            if (!visualizationEl) {
              return;
            }
            this._loader = loader;
            this._handler = this._loader.embedVisualizationWithSavedObject(visualizationEl, this.savedObj, {
              uiState: uiState,
              listenOnChange: false,
              timeRange: timeRange,
              appState: appState,
            });
          });
        } else {
          this._handler.update({
            timeRange: timeRange
          });
        }

      });
    }

    resize() {

    }

    destroy() {
      if (this.$scope) {
        this.$scope.$destroy();
        this.$scope = null;
      }
      if (this._handler) {
        this._handler.destroy();
      }
    }
  };
};

VisEditorTypesRegistryProvider.register(defaultEditor);

export { defaultEditor };
