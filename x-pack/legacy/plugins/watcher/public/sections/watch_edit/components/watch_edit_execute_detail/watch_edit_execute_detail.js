/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, get } from 'lodash';
import { uiModules } from 'ui/modules';
import template from './watch_edit_execute_detail.html';
import '../watch_action_mode_table';
import 'ace';
import 'plugins/watcher/directives/toggle_panel';
import { ExecuteDetails } from 'plugins/watcher/models/execute_details';

const app = uiModules.get('xpack/watcher');

app.directive('watchEditExecuteDetail', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      watch: '=xpackWatch', // Property names differ due to https://git.io/vSWXV
      previousWatchHistoryItem: '=',
      onChange: '=',
      onInvalid: '=',
      onValid: '='
    },
    bindToController: true,
    controllerAs: 'watchEditExecuteDetail',
    controller: class WatchEditExecuteDetailController {
      constructor($scope) {
        this.executeDetails = new ExecuteDetails();

        this.isCollapsed = {
          trigger: true,
          input: true,
          condition: true,
          action: true
        };

        $scope.aceLoaded = (editor) => {
          this.editor = editor;
          editor.$blockScrolling = Infinity;
        };

        $scope.$watchMulti([
          'watchEditExecuteDetail.executeDetails.triggeredTime',
          'watchEditExecuteDetail.executeDetails.scheduledTime',
          'watchEditExecuteDetail.executeDetails.ignoreCondition',
          'watchEditExecuteDetail.executeDetails.recordExecution',
          'watchEditExecuteDetail.executeDetails.actionModes'
        ], this.reportChanges);
      }

      onSectionToggle = (sectionId) => {
        this.isCollapsed[sectionId] = !this.isCollapsed[sectionId];
      }

      isSectionCollapsed = (sectionId) => {
        return this.isCollapsed[sectionId];
      }

      onActionModesChanged = (actionModes) => {
        this.executeDetails.actionModes = actionModes;
      }

      copyFromPreviousExecution = () => {
        this.executeDetails.alternativeInput = get(
          this.previousWatchHistoryItem.details,
          'result.input.payload'
        );
      }

      reportChanges = () => {
        const isValid = this.triggerForm.$valid &&
          (this.isAlternativeInputValid || this.isAlternativeInputEmpty) &&
          this.conditionForm.$valid &&
          this.actionForm.$valid;

        if (isValid) {
          this.onValid();
        } else {
          this.onInvalid();
        }

        this.onChange(this.executeDetails);
      }

      onAlternativeInputValid = () => {
        this.isAlternativeInputValid = true;
        this.reportChanges();
      }

      onAlternativeInputInvalid = () => {
        this.isAlternativeInputValid = false;
        this.reportChanges();
      }

      onAlternativeInputChange = (json) => {
        this.executeDetails.alternativeInput = json;
        this.reportChanges();
      }

      get isAlternativeInputEmpty() {
        return isEmpty(String(this.executeDetails.alternativeInput));
      }
    }
  };
});
