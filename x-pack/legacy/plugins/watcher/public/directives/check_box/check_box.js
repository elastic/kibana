/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import template from './check_box.html';

const app = uiModules.get('xpack/watcher');

app.directive('checkBox', function () {
  return {
    restrict: 'E',
    replace: true,
    template,
    scope: {
      id: '=',
      isSelected: '=',
      onSelectChange: '=',
    },
    controllerAs: 'checkBox',
    bindToController: true,
    controller: class CheckBoxController {
    }
  };
});
