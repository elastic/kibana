/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

/** Aborts when the client that made `request` goes away. */
export const abortSignalFor = (request: KibanaRequest): AbortSignal => {
  const controller = new AbortController();
  request.events.aborted$.subscribe(() => controller.abort());
  return controller.signal;
};
