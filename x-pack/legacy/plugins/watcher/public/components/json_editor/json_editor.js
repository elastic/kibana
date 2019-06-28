/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import template from './json_editor.html';
import 'plugins/watcher/directives/json_input';
import 'ace';

const app = uiModules.get('xpack/watcher');

app.directive('jsonEditor', function () {
  return {
    restrict: 'E',
    template: template,
    replace: true,
    scope: {
      json: '=',
      onChange: '=',
      onValid: '=',
      onInvalid: '='
    },
    bindToController: true,
    controllerAs: 'jsonEditor',
    controller: class JsonEditorController {
      constructor($scope) {
        $scope.aceLoaded = (editor) => {
          this.editor = editor;
          editor.$blockScrolling = Infinity;
        };

        $scope.$watch('jsonEditor.form.$valid', () => {
          if (this.form.$invalid) {
            this.onInvalid();
          } else {
            this.onValid();
          }
        });

        $scope.$watch('jsonEditor.json', () => {
          this.onChange(this.json);
        });
      }
    }
  };
});
