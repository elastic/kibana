/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import template from './watch_history_item_watch_summary.html';
import 'plugins/watcher/components/watch_state_icon';

const app = uiModules.get('xpack/watcher');

app.directive('watchHistoryItemWatchSummary', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {
      watchHistoryItem: '='
    },
    bindToController: true,
    controllerAs: 'watchHistoryItemWatchSummary',
    controller: class WatchHistoryItemWatchSummaryController {
      constructor() {}
    }
  };
});
