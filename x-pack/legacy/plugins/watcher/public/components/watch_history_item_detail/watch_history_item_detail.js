/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import 'plugins/watcher/directives/json_input';
import template from './watch_history_item_detail.html';
import 'ace';

const app = uiModules.get('xpack/watcher');

app.directive('watchHistoryItemDetail', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      watchHistoryItem: '='
    },
    bindToController: true,
    controllerAs: 'watchHistoryItemDetail',
    controller: class WatchHistoryItemDetailController {
      constructor($scope) {
        $scope.aceLoaded = (editor) => {
          this.editor = editor;
          editor.$blockScrolling = Infinity;
        };
      }
    }
  };
});
