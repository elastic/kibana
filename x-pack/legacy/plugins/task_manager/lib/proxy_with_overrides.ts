/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function proxyWithOverrides<T extends object>(
  target: T,
  overrides: Partial<PublicMethodsOf<T>>
): T {
  return new Proxy(target, {
    get(obj, prop): any {
      if (prop in obj && prop in overrides) {
        return Reflect.get(overrides, prop);
      }
      return Reflect.get(obj, prop);
    },
  });
}
