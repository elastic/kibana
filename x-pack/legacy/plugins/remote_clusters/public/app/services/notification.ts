/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NotificationsStart, FatalErrorsSetup } from 'src/core/public';

export let toasts: NotificationsStart;
export let fatalError: FatalErrorsSetup;

export function init(_toasts: NotificationsStart, _fatalError: FatalErrorsSetup): void {
  toasts = _toasts;
  fatalError = _fatalError;
}
