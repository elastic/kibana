/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LRUCache } from 'lru-cache';
import { stableStringify } from '@kbn/std';

export interface IHashedCache<KeyType, ValueType> {
  get(key: KeyType): ValueType | undefined;
  set(key: KeyType, value: ValueType): boolean;
  has(key: KeyType): boolean;
  reset(): void;
}

export class HashedCache<KeyType extends unknown, ValueType extends {}> {
  private cache: LRUCache<string, ValueType>;

  constructor(options: LRUCache.Options<string, ValueType, unknown> = { max: 500 }) {
    this.cache = new LRUCache<string, ValueType>(options);
  }

  public get(key: KeyType): ValueType | undefined {
    const serializedKey = stableStringify(key);
    return this.cache.get(serializedKey);
  }

  public set(key: KeyType, value: ValueType) {
    const serializedKey = stableStringify(key);
    return this.cache.set(serializedKey, value);
  }

  public has(key: KeyType): boolean {
    const serializedKey = stableStringify(key);
    return this.cache.has(serializedKey);
  }

  public reset() {
    return this.cache.clear();
  }
}
