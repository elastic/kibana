/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCalloutId } from './helpers';

describe('createCalloutId', () => {
  it('creates id correctly with one id', () => {
    const digest = encodeURIComponent('one');
    const id = createCalloutId(['one']);
    expect(id).toBe(digest);
  });

  it('creates id correctly with multiples ids', () => {
    const digest = encodeURIComponent('one|two|three');
    const id = createCalloutId(['one', 'two', 'three']);
    expect(id).toBe(digest);
  });

  it('creates id correctly with multiples ids and delimiter', () => {
    const digest = encodeURIComponent('one,two,three');
    const id = createCalloutId(['one', 'two', 'three'], ',');
    expect(id).toBe(digest);
  });
});
