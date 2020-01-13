/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import template from './password_form.html';

const module = uiModules.get('security', ['kibana']);
module.directive('kbnPasswordForm', function() {
  return {
    template,
    scope: {
      password: '=',
    },
    restrict: 'E',
    replace: true,
    controllerAs: 'passwordController',
    controller: function() {
      this.confirmation = null;
    },
  };
});
