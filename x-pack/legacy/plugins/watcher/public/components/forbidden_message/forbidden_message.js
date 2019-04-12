/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import template from './forbidden_message.html';

const app = uiModules.get('xpack/watcher');

app.directive('forbiddenMessage', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    transclude: true,
    scope: {},
    controllerAs: 'forbiddenMessage',
    bindToController: true,
    controller: class ForbiddenMessageController {
      constructor() { }
    }
  };
});
