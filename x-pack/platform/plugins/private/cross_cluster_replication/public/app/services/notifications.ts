/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IToasts, FatalErrorsSetup } from '@kbn/core/public';

let _toasts: IToasts | undefined;
let _fatalErrors: FatalErrorsSetup | undefined;

export const init = (toasts: IToasts, fatalErrors: FatalErrorsSetup): void => {
  _toasts = toasts;
  _fatalErrors = fatalErrors;
};

export const getToasts = (): IToasts => {
  if (_toasts === undefined) {
    throw new Error('CCR notifications were used before init() was called');
  }
  return _toasts;
};

export const getFatalErrors = (): FatalErrorsSetup => {
  if (_fatalErrors === undefined) {
    throw new Error('CCR notifications were used before init() was called');
  }
  return _fatalErrors;
};
