/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMaxPackageName } from '.';

describe('get max package policy name', () => {
  it('should return index 1 when no policies', () => {
    const name = getMaxPackageName('apache', []);
    expect(name).toEqual('apache-1');
  });

  it('should return index 1 when policies with other name', () => {
    const name = getMaxPackageName('apache', [{ name: 'package' } as any]);
    expect(name).toEqual('apache-1');
  });

  it('should return index 2 when policies 1 exists', () => {
    const name = getMaxPackageName('apache', [{ name: 'apache-1' } as any]);
    expect(name).toEqual('apache-2');
  });

  it('should return index 11 when policy 10 is max', () => {
    const name = getMaxPackageName('apache', [
      { name: 'apache-10' } as any,
      { name: 'apache-9' } as any,
      { name: 'package' } as any,
    ]);
    expect(name).toEqual('apache-11');
  });

  it('should return index 1 when policies undefined', () => {
    const name = getMaxPackageName('apache');
    expect(name).toEqual('apache-1');
  });
});
