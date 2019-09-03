/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fatalError, toasts } from './notification';

function createToastConfig(error, errorTitle) {
  // Expect an error in the shape provided by Angular's $http service.
  if (error && error.data) {
    const { error: errorString, statusCode, message } = error.data;
    return {
      title: errorTitle,
      text: `${statusCode}: ${errorString}. ${message}`,
    };
  }
}

export function showApiWarning(error, errorTitle) {
  const toastConfig = createToastConfig(error, errorTitle);

  if (toastConfig) {
    return toasts.addWarning(toastConfig);
  }

  // This error isn't an HTTP error, so let the fatal error screen tell the user something
  // unexpected happened.
  return fatalError(error, errorTitle);
}

export function showApiError(error, errorTitle) {
  const toastConfig = createToastConfig(error, errorTitle);

  if (toastConfig) {
    return toasts.addDanger(toastConfig);
  }

  // This error isn't an HTTP error, so let the fatal error screen tell the user something
  // unexpected happened.
  fatalError(error, errorTitle);
}
