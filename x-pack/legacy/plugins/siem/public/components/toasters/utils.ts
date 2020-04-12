/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { isError } from 'lodash/fp';

import { AppToast, ActionToaster } from './';
import { isToasterError } from './errors';
import { isApiError } from '../../utils/api';

/**
 * Displays an error toast for the provided title and message
 *
 * @param errorTitle Title of error to display in toaster and modal
 * @param errorMessages Message to display in error modal when clicked
 * @param dispatchToaster provided by useStateToaster()
 */
export const displayErrorToast = (
  errorTitle: string,
  errorMessages: string[],
  dispatchToaster: React.Dispatch<ActionToaster>,
  id: string = uuid.v4()
): void => {
  const toast: AppToast = {
    id,
    title: errorTitle,
    color: 'danger',
    iconType: 'alert',
    errors: errorMessages,
  };
  dispatchToaster({
    type: 'addToaster',
    toast,
  });
};

/**
 * Displays a warning toast for the provided title and message
 *
 * @param title warning message to display in toaster and modal
 * @param dispatchToaster provided by useStateToaster()
 * @param id unique ID if necessary
 */
export const displayWarningToast = (
  title: string,
  dispatchToaster: React.Dispatch<ActionToaster>,
  id: string = uuid.v4()
): void => {
  const toast: AppToast = {
    id,
    title,
    color: 'warning',
    iconType: 'help',
  };
  dispatchToaster({
    type: 'addToaster',
    toast,
  });
};

/**
 * Displays a success toast for the provided title and message
 *
 * @param title success message to display in toaster and modal
 * @param dispatchToaster provided by useStateToaster()
 */
export const displaySuccessToast = (
  title: string,
  dispatchToaster: React.Dispatch<ActionToaster>,
  id: string = uuid.v4()
): void => {
  const toast: AppToast = {
    id,
    title,
    color: 'success',
    iconType: 'check',
  };
  dispatchToaster({
    type: 'addToaster',
    toast,
  });
};

export type ErrorToToasterArgs = Partial<AppToast> & {
  error: unknown;
  dispatchToaster: React.Dispatch<ActionToaster>;
};

/**
 * Displays an error toast with messages parsed from the error
 *
 * @param title error message to display in toaster and modal
 * @param error the error from which messages will be parsed
 * @param dispatchToaster provided by useStateToaster()
 */
export const errorToToaster = ({
  id = uuid.v4(),
  title,
  error,
  color = 'danger',
  iconType = 'alert',
  dispatchToaster,
}: ErrorToToasterArgs) => {
  let toast: AppToast;

  if (isToasterError(error)) {
    toast = {
      id,
      title,
      color,
      iconType,
      errors: error.messages,
    };
  } else if (isApiError(error)) {
    toast = {
      id,
      title,
      color,
      iconType,
      errors: [error.body.message],
    };
  } else if (isError(error)) {
    toast = {
      id,
      title,
      color,
      iconType,
      errors: [error.message],
    };
  } else {
    toast = {
      id,
      title,
      color,
      iconType,
      errors: ['Network Error'],
    };
  }

  dispatchToaster({
    type: 'addToaster',
    toast,
  });
};
