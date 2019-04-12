/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find } from 'lodash';
import { uiModules } from 'ui/modules';
import template from './watch_edit_actions_execute_summary.html';
import 'plugins/watcher/components/action_state_icon';

const app = uiModules.get('xpack/watcher');

app.directive('watchEditActionsExecuteSummary', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {
      watch: '=xpackWatch', // Property names differ due to https://git.io/vSWXV
      watchHistoryItem: '=',
      executeDetails: '='
    },
    bindToController: true,
    controllerAs: 'watchEditActionsExecuteSummary',
    controller: class WatchEditActionsExecuteSummaryController {
      constructor($scope) {
        $scope.$watch('watchEditActionsExecuteSummary.watchHistoryItem', () => {
          if (!this.watchHistoryItem) {
            return;
          }

          const actions = this.watch.actions;
          const actionStatuses = this.watchHistoryItem.watchStatus.actionStatuses;
          const actionModes = this.executeDetails.actionModes;

          this.actionDetails = actions.map(action => {
            const actionMode = actionModes[action.id];
            const actionStatus = find(actionStatuses, { id: action.id });

            return {
              action,
              actionMode,
              actionStatus
            };
          });
        });
      }
    }
  };
});
