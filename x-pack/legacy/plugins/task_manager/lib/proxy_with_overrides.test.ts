/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { proxyWithOverrides } from './proxy_with_overrides';

class ClassToProxy {
  public readonly primitiveProperty: number;

  constructor(arg: number) {
    this.primitiveProperty = arg;
  }

  public method(arg: number): number {
    return arg + this.primitiveProperty;
  }

  public async asyncMethod(arg: number): Promise<number> {
    return arg + this.primitiveProperty;
  }
}

describe('proxyWithOverrides', () => {
  test('it acts as a proxy over all types of properties and methods', async () => {
    const instance = new ClassToProxy(10);
    const prixiedObject: ClassToProxy = proxyWithOverrides<ClassToProxy>(instance, {});

    expect(prixiedObject.primitiveProperty).toEqual(instance.primitiveProperty);
    expect(prixiedObject.method(5)).toEqual(instance.method(5));
    expect(await prixiedObject.asyncMethod(5)).toEqual(await instance.asyncMethod(5));
  });

  test('it takes overrides over its public methods', async () => {
    const instance = new ClassToProxy(10);
    const prixiedObject: ClassToProxy = proxyWithOverrides<ClassToProxy>(instance, {
      method(arg: number): number {
        return arg;
      },
      async asyncMethod(arg: number): Promise<number> {
        return arg;
      },
    });

    expect(prixiedObject.primitiveProperty).toEqual(instance.primitiveProperty);
    expect(prixiedObject.method(5)).toEqual(5);
    expect(instance.method(5)).toEqual(15);
    expect(await prixiedObject.asyncMethod(5)).toEqual(5);
    expect(await instance.asyncMethod(5)).toEqual(15);
  });
});
