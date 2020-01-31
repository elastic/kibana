/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VALIDATION_STATUS } from '../constants/validation';

// get the most severe status level from a list of messages
const contains = (arr, str) => arr.findIndex(v => v === str) >= 0;
export function getMostSevereMessageStatus(messages) {
  const statuses = messages.map(m => m.status);
  return [VALIDATION_STATUS.INFO, VALIDATION_STATUS.WARNING, VALIDATION_STATUS.ERROR].reduce(
    (previous, current) => {
      return contains(statuses, current) ? current : previous;
    },
    VALIDATION_STATUS.SUCCESS
  );
}

// extends an angular directive's scope with the necessary methods
// needed to embed the job validation button
export function addJobValidationMethods($scope, service) {
  $scope.getDuration = () => ({
    start: $scope.formConfig.start,
    end: $scope.formConfig.end,
  });

  // isCurrentJobConfig is used to track if the form configuration
  // changed since the last job validation was done
  $scope.isCurrentJobConfig = false;
  // need to pass true as third argument here to track granular changes
  $scope.$watch(
    'formConfig',
    () => {
      $scope.isCurrentJobConfig = false;
    },
    true
  );
  $scope.getJobConfig = () => {
    $scope.isCurrentJobConfig = true;
    return service.getJobFromConfig($scope.formConfig);
  };
}

export function isValidJson(json) {
  if (json === null) {
    return false;
  }

  try {
    JSON.parse(json);
    return true;
  } catch (error) {
    return false;
  }
}
