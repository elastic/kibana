/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import template from '../templates/save_workspace.html';
const app = uiModules.get('app/graph');

app.directive('graphSave', function () {
  return {
    replace: true,
    restrict: 'E',
    template,
  };
});
