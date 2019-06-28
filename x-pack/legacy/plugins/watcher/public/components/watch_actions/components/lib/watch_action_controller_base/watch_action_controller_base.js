/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class WatchActionControllerBase {
  constructor($scope) {
    this.action = $scope.action;
    this.form = $scope.form;
    this.onChange = $scope.onChange;
  }

  isValidationMessageVisible = (fieldName, errorType) => {
    return this.form[fieldName].$touched &&
      this.form[fieldName].$error[errorType];
  }
}
