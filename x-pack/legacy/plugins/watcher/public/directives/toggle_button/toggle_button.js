/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import template from './toggle_button.html';

const app = uiModules.get('xpack/watcher');

app.directive('toggleButton', function () {
  return {
    restrict: 'E',
    replace: true,
    transclude: true,
    template: template,
    scope: {
      isDisabled: '=',
      isCollapsed: '=',
      onClick: '=',
    },
    controllerAs: 'toggleButton',
    bindToController: true,
    controller: class ToggleButtonController {
    }
  };
});
