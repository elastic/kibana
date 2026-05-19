/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext, TaskInstance } from '../task';
type Mapper<T> = (params: T) => Promise<T>;
interface BeforeSaveContext {
  taskInstance: TaskInstance;
}
export type BeforeRunContext = Omit<RunContext, 'abortController'>;
export type BeforeSaveContextFunction = Mapper<BeforeSaveContext>;
export type BeforeRunContextFunction = Mapper<BeforeRunContext>;
export interface Middleware {
  beforeSave: BeforeSaveContextFunction;
  beforeRun: BeforeRunContextFunction;
  beforeMarkRunning: BeforeRunContextFunction;
}
export declare function addMiddlewareToChain(
  prev: Middleware,
  next: Partial<Middleware>
): {
  beforeSave: BeforeSaveContextFunction;
  beforeRun: BeforeRunContextFunction;
  beforeMarkRunning: BeforeRunContextFunction;
};
export declare function createInitialMiddleware(): Middleware;
export {};
