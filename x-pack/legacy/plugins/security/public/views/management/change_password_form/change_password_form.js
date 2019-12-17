/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import template from './change_password_form.html';

const module = uiModules.get('security', ['kibana']);
module.directive('kbnChangePasswordForm', function() {
  return {
    template,
    scope: {
      requireCurrentPassword: '=',
      showKibanaWarning: '=',
      onChangePassword: '&',
    },
    restrict: 'E',
    replace: true,
    controllerAs: 'changePasswordController',
    controller: function($scope) {
      this.currentPassword = null;
      this.newPassword = null;
      this.newPasswordConfirmation = null;
      this.isFormVisible = false;
      this.isIncorrectPassword = false;

      this.showForm = () => {
        this.isFormVisible = true;
      };

      this.hideForm = () => {
        $scope.changePasswordForm.$setPristine();
        $scope.changePasswordForm.$setUntouched();
        this.currentPassword = null;
        this.newPassword = null;
        this.newPasswordConfirmation = null;
        this.isFormVisible = false;
        this.isIncorrectPassword = false;
      };

      this.onIncorrectPassword = () => {
        this.isIncorrectPassword = true;
      };
    },
  };
});
