/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreDiServiceStart } from '@kbn/core-di';
import type { KibanaRequest } from '@kbn/core-http-server';
import { Request } from '@kbn/core-di-server';
import { Global } from '@kbn/core-di-internal';
import { injectable } from 'inversify';
import type { Container, ServiceIdentifier } from 'inversify';

@injectable()
export class TaskRunScopeService {
  private di?: CoreDiServiceStart;

  public initialize(di: CoreDiServiceStart) {
    this.di = di;
  }

  public getScopedServices<const TServices extends readonly ServiceIdentifier<any>[]>(
    fakeRequest: KibanaRequest,
    services: TServices
  ): {
    scope: Container;
    services: {
      [K in keyof TServices]: TServices[K] extends ServiceIdentifier<infer U> ? U : never;
    };
    dispose: () => void;
  } {
    if (!this.di) {
      throw new Error('TaskRunScopeService is not initialized. Was OnStart executed?');
    }

    const scope = this.di.fork();
    scope.bind(Request).toConstantValue(fakeRequest);
    scope.bind(Global).toConstantValue(Request);

    const resolved = services.map((id) => scope.get(id)) as {
      [K in keyof TServices]: TServices[K] extends ServiceIdentifier<infer U> ? U : never;
    };

    return {
      scope,
      services: resolved,
      dispose: () => scope.unbindAll(),
    };
  }

  public async withTaskRunRequestScope<T>(
    fakeRequest: KibanaRequest,
    fn: (scope: Container) => Promise<T> | T
  ): Promise<T>;

  public async withTaskRunRequestScope(
    fakeRequest: KibanaRequest,
    fn: (scope: Container) => Promise<unknown> | unknown
  ) {
    if (!this.di) {
      throw new Error('TaskRunScopeService is not initialized. Was OnStart executed?');
    }

    const scope = this.di.fork();
    scope.bind(Request).toConstantValue(fakeRequest);
    scope.bind(Global).toConstantValue(Request);

    try {
      return await fn(scope);
    } finally {
      scope.unbindAll();
    }
  }
}
