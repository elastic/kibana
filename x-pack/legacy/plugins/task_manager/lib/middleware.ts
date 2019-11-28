/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RunContext, TaskInstance } from '../task';

/*
 * BeforeSaveMiddlewareParams is nearly identical to RunContext, but
 * taskInstance is before save (no _id property)
 *
 * taskInstance property is guaranteed to exist. The params can optionally
 * include fields from an "options" object passed as the 2nd parameter to
 * taskManager.schedule()
 */
export interface BeforeSaveMiddlewareParams {
  taskInstance: TaskInstance;
}

export type BeforeSaveFunction = (
  params: BeforeSaveMiddlewareParams
) => Promise<BeforeSaveMiddlewareParams>;

export type BeforeRunFunction = (params: RunContext) => Promise<RunContext>;
export type BeforeMarkRunningFunction = (params: RunContext) => Promise<RunContext>;

export interface Middleware {
  beforeSave: BeforeSaveFunction;
  beforeRun: BeforeRunFunction;
  beforeMarkRunning: BeforeMarkRunningFunction;
}

export function addMiddlewareToChain(prevMiddleware: Middleware, middleware: Middleware) {
  const beforeSave = middleware.beforeSave
    ? (params: BeforeSaveMiddlewareParams) =>
        middleware.beforeSave(params).then(prevMiddleware.beforeSave)
    : prevMiddleware.beforeSave;

  const beforeRun = middleware.beforeRun
    ? (params: RunContext) => middleware.beforeRun(params).then(prevMiddleware.beforeRun)
    : prevMiddleware.beforeRun;

  const beforeMarkRunning = middleware.beforeMarkRunning
    ? (params: RunContext) =>
        middleware.beforeMarkRunning(params).then(prevMiddleware.beforeMarkRunning)
    : prevMiddleware.beforeMarkRunning;

  return {
    beforeSave,
    beforeRun,
    beforeMarkRunning,
  };
}
