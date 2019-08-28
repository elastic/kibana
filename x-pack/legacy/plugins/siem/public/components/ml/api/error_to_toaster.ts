/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isError } from 'lodash/fp';
import uuid from 'uuid';
import { ActionToaster, AppToast } from '../../toasters';
import { ToasterErrorsType, ToasterErrors } from './throw_if_not_ok';

export type ErrorToToasterArgs = Partial<AppToast> & {
  error: unknown;
  dispatchToaster: React.Dispatch<ActionToaster>;
};

export const errorToToaster = ({
  id = uuid.v4(),
  title,
  error,
  color = 'danger',
  iconType = 'alert',
  dispatchToaster,
}: ErrorToToasterArgs) => {
  if (isToasterError(error)) {
    const toast: AppToast = {
      id,
      title,
      color,
      iconType,
      errors: error.messages,
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
      errors: [error.message],
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
      errors: ['Network Error'],
    };
    dispatchToaster({
      type: 'addToaster',
      toast,
    });
  }
};

export const isAnError = (error: unknown): error is Error => isError(error);

export const isToasterError = (error: unknown): error is ToasterErrorsType =>
  error instanceof ToasterErrors;
