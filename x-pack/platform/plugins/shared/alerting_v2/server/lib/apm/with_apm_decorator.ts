/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan as apmWithSpan } from '@kbn/apm-utils';
import { APP_ID } from '../constants';

/**
 * Returns a method decorator that wraps the method in an APM span.
 * Use on public async methods to ensure they are traced with name `methodName` and the given type.
 * @param type - APM span type (e.g. 'rules_client'); used for grouping spans.
 */
export function withApm(type: string) {
  return function (
    _target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const original = descriptor.value;

    if (typeof original !== 'function') {
      return descriptor;
    }

    descriptor.value = function (this: object, ...args: unknown[]) {
      return apmWithSpan({ name: propertyKey, type, labels: { plugin: APP_ID } }, () =>
        original.apply(this, args)
      );
    };

    return descriptor;
  };
}
