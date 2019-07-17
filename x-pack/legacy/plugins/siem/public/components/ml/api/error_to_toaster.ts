/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isError, isString } from 'lodash/fp';
import uuid from 'uuid';
import { ActionToaster, AppToast } from '../../toasters';
import { ToasterErrorsType, ToasterErrors } from './throw_if_not_ok';

export type ErrorTypes = Error | string | unknown;

export type ErrorToToasterArgs = Partial<AppToast> & {
  error: ErrorTypes;
  dispatchToaster: React.Dispatch<ActionToaster>;
  additionalErrors?: string[];
};

export const errorToToaster = ({
  id = uuid.v4(),
  title = 'Data Fetch Failure',
  error,
  color = 'danger',
  iconType = 'alert',
  additionalErrors = [],
  dispatchToaster,
}: ErrorToToasterArgs) => {
  if (isToasterError(error)) {
    const toast: AppToast = {
      id,
      title,
      color,
      iconType,
      errors: [...additionalErrors, ...error.messages],
    };
    dispatchToaster({
      type: 'addToaster',
      toast,
    });
  } else if (isAnError(error)) {
    const toast: AppToast = {
      id,
      title,
      color,
      iconType,
      errors: [...additionalErrors, error.message],
    };
    dispatchToaster({
      type: 'addToaster',
      toast,
    });
  } else {
    const toast: AppToast = {
      id,
      title,
      color,
      iconType,
      errors: [...additionalErrors, 'Network Error'],
    };
    dispatchToaster({
      type: 'addToaster',
      toast,
    });
  }
};

// TODO: Use this or delete it
export const isAString = (error: unknown): error is string => isString(error);

export const isAnError = (error: unknown): error is Error => isError(error);

export const isToasterError = (error: unknown): error is ToasterErrorsType =>
  error instanceof ToasterErrors;
