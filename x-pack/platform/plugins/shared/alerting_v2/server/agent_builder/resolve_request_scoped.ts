/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreDiServiceStart } from '@kbn/core-di';
import { ProvidedService } from '@kbn/core-di-internal';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ServiceIdentifier } from 'inversify';

/**
 * Resolves a request-scoped service outside the core HTTP route pipeline.
 *
 * Agent Builder tool handlers (SML types, attachment types) receive a real
 * `KibanaRequest` but execute outside the route pipeline, so the automatic
 * per-request container scope (set up by core-di's `loadHttp` module) is never
 * created for them. This forks the container, binds the incoming request, and
 * resolves the requested token in that scope — replicating what the route
 * pipeline does, and what `getRulesClientWithRequest` / `createTaskRunnerFactory`
 * do for their own callers.
 *
 * If this needs to be shared with other inversify-based plugins, promote it to
 * `@kbn/core-di`.
 */
export const resolveRequestScoped = <T>(
  injection: CoreDiServiceStart,
  request: KibanaRequest,
  token: ServiceIdentifier<T>
): T => {
  const scope = injection.fork();
  scope.bind(Request).toConstantValue(request);
  scope.bind(ProvidedService).toConstantValue(Request);
  return scope.get(token);
};
