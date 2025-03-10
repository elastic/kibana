/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TODO:
 * IMPORTANT: Please see how {@link BreadcrumbService} is set up for an example of how these services should be set up
 * in future. The pattern in this file is legacy and should be updated to conform to the plugin lifecycle.
 */

import { IToasts, FatalErrorsSetup } from '@kbn/core/public';

export let toasts: IToasts;
export let fatalErrors: FatalErrorsSetup;

export function init(_toasts: IToasts, _fatalErrors: FatalErrorsSetup): void {
  toasts = _toasts;
  fatalErrors = _fatalErrors;
}
