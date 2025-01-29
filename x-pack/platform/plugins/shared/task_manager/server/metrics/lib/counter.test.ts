/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Counter } from './counter';

describe('Counter', () => {
  let counter: Counter;
  beforeEach(() => {
    counter = new Counter();
  });

  test('should correctly initialize', () => {
    expect(counter.get()).toEqual(0);
  });

  test('should correctly return initialCount', () => {
    expect(counter.initialCount()).toEqual(0);
  });

  test('should correctly increment counter', () => {
    counter.increment();
    counter.increment();
    expect(counter.get()).toEqual(2);
  });

  test('should correctly reset counter', () => {
    counter.increment();
    counter.increment();
    counter.increment();
    counter.increment();
    counter.increment();
    counter.increment();
    counter.increment();
    expect(counter.get()).toEqual(7);

    counter.reset();
    expect(counter.get()).toEqual(0);
  });
});
