/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart, npSetup } from '../../legacy_imports';

function createToastConfig(error: any, errorTitle: string) {
  // Expect an error in the shape provided by Angular's $http service.
  if (error && error.data) {
    const { error: errorString, statusCode, message } = error.data;
    return {
      title: errorTitle,
      text: `${statusCode}: ${errorString}. ${message}`,
    };
  }
}

export function showApiWarning(error: any, errorTitle: string) {
  const toastConfig = createToastConfig(error, errorTitle);

  if (toastConfig) {
    return npStart.core.notifications.toasts.addWarning(toastConfig);
  }

  // This error isn't an HTTP error, so let the fatal error screen tell the user something
  // unexpected happened.
  return npSetup.core.fatalErrors.add(error, errorTitle);
}

export function showApiError(error: any, errorTitle: string) {
  const toastConfig = createToastConfig(error, errorTitle);

  if (toastConfig) {
    return npStart.core.notifications.toasts.addDanger(toastConfig);
  }

  // This error isn't an HTTP error, so let the fatal error screen tell the user something
  // unexpected happened.
  npSetup.core.fatalErrors.add(error, errorTitle);
}
