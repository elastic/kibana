/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';

export function getRequestAbortedSignal(aborted$: Observable<void>): AbortSignal {
  const controller = new AbortController();
  aborted$.subscribe(() => controller.abort());
  return controller.signal;
}
