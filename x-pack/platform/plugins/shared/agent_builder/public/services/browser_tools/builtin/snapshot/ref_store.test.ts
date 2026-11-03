/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KEPT_GENERATIONS } from './constants';
import { RefStore, getRefStore } from './ref_store';

describe('RefStore', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const attached = () => document.body.appendChild(document.createElement('button'));

  it('assigns refs numbered from 1 per generation', () => {
    const store = new RefStore();
    const gen = store.beginGeneration();
    expect(gen).toBe(1);
    expect(store.assign(gen, attached())).toBe('s1e1');
    expect(store.assign(gen, attached())).toBe('s1e2');
    const gen2 = store.beginGeneration();
    expect(store.assign(gen2, attached())).toBe('s2e1');
  });

  it('resolves live refs and returns undefined for unknown refs', () => {
    const store = new RefStore();
    const el = attached();
    const ref = store.assign(store.beginGeneration(), el);
    expect(store.resolve(ref)).toBe(el);
    expect(store.resolve('s1e99')).toBeUndefined();
    expect(store.resolve('s9e1')).toBeUndefined();
    expect(store.resolve('garbage')).toBeUndefined();
  });

  it('returns undefined for detached elements', () => {
    const store = new RefStore();
    const el = attached();
    const ref = store.assign(store.beginGeneration(), el);
    el.remove();
    expect(store.resolve(ref)).toBeUndefined();
  });

  it(`evicts generations older than the last ${KEPT_GENERATIONS}`, () => {
    const store = new RefStore();
    const first = store.assign(store.beginGeneration(), attached());
    for (let i = 1; i < KEPT_GENERATIONS; i++) {
      store.beginGeneration();
    }
    expect(store.resolve(first)).toBeDefined();
    store.beginGeneration();
    expect(store.resolve(first)).toBeUndefined();
  });

  it('getRefStore returns a singleton', () => {
    expect(getRefStore()).toBe(getRefStore());
  });
});
