/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityId, factId, kiIdFromUri, kiUri, slugify } from './ids';

describe('dreaming ids', () => {
  it('folds case, accents and punctuation out of entity names', () => {
    expect(slugify('Acme Corp.')).toBe('acme-corp');
    expect(slugify('  Montréal, Québec ')).toBe('montreal-quebec');
    expect(entityId('customer', 'Customer 825464')).toBe('entity-customer-customer-825464');
  });

  it('falls back to a hash for names with nothing to keep', () => {
    expect(slugify('東京')).toMatch(/^[0-9a-f]{16}$/);
  });

  it('gives a fact the same id for the same run and key, and another for another run', () => {
    expect(factId('exec-1', 'new:1')).toBe(factId('exec-1', 'new:1'));
    expect(factId('exec-1', 'new:1')).not.toBe(factId('exec-2', 'new:1'));
  });

  it('round-trips KI URIs', () => {
    expect(kiIdFromUri(kiUri('mem-1'))).toBe('mem-1');
    expect(kiIdFromUri('index://logs')).toBeUndefined();
  });
});
