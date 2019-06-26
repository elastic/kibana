/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { InitAfterBindingsWorkaround } from 'ui/compat';
import template from './watch_history_item.html';

import 'plugins/watcher/components/watch_history_item_detail';
import '../watch_history_item_watch_summary';
import '../watch_history_item_actions_summary';

const app = uiModules.get('xpack/watcher');

app.directive('watchHistoryItem', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      watch: '=xpackWatch', // Property names differ due to https://git.io/vSWXV
      watchHistoryItem: '=',
    },
    bindToController: true,
    controllerAs: 'watchHistoryItem',
    controller: class WatchHistoryItemController extends InitAfterBindingsWorkaround {
      initAfterBindings() {
        this.omitBreadcrumbPages = [
          'watch',
          'history-item',
          this.watch.id
        ];
        this.breadcrumb = this.watch.displayName;
      }
    }
  };
});
