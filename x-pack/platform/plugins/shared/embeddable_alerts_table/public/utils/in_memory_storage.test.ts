/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InMemoryStorage } from './in_memory_storage';

describe('InMemoryStorage', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  it('should set and get a value', () => {
    storage.set('key', 'value');
    expect(storage.get('key')).toBe('value');
  });

  it('should remove a value', () => {
    storage.set('key', 'value');
    storage.remove('key');
    expect(storage.get('key')).toBeUndefined();
  });

  it('should clear all values', () => {
    storage.set('key1', 'value1');
    storage.set('key2', 'value2');
    storage.clear();
    expect(storage.get('key1')).toBeUndefined();
    expect(storage.get('key2')).toBeUndefined();
  });
});
