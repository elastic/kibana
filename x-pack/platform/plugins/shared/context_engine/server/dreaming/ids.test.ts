/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { batchKeyOf, entityId, factId, kiIdFromUri, kiUri, slugify } from './ids';

describe('dreaming ids', () => {
  it('folds case, accents and punctuation out of entity names', () => {
    expect(slugify('Acme Corp.')).toBe('acme-corp');
    expect(slugify('  Montréal, Québec ')).toBe('montreal-quebec');
    expect(entityId('customer', 'Customer 825464')).toBe('entity-customer--customer-825464');
  });

  it('keeps entities apart whose type and name split the same words differently', () => {
    expect(entityId('support_team', 'Billing')).not.toBe(entityId('support', 'Team Billing'));
  });

  it('falls back to a hash for names with nothing to keep', () => {
    expect(slugify('東京')).toMatch(/^[0-9a-f]{16}$/);
    expect(slugify('東京')).not.toBe(slugify('大阪'));
  });

  it('keeps names apart that differ only in letters outside a-z', () => {
    const zhang = slugify('Customer 张三');
    const li = slugify('Customer 李四');

    expect(zhang).toMatch(/^customer-[0-9a-f]{16}$/);
    expect(zhang).not.toBe(li);
    expect(slugify('CUSTOMER  张三!')).toBe(zhang);
  });

  it('keeps names apart that differ only in marks outside Latin script', () => {
    expect(slugify('राम')).not.toBe(slugify('रमा'));
    expect(slugify('Customer राम')).not.toBe(slugify('Customer रमा'));
  });

  it('keeps names apart that share their first characters when cut short', () => {
    const long = 'x'.repeat(120);

    expect(slugify(`${long} a`)).not.toBe(slugify(`${long} b`));
    expect(slugify(`${long} a`).length).toBeLessThanOrEqual(96 + 1 + 16);
  });

  it('gives a fact the same id for the same run, batch and key, and another otherwise', () => {
    const batch = batchKeyOf(['m-2', 'm-1']);

    expect(batch).toBe(batchKeyOf(['m-1', 'm-2']));
    expect(factId('exec-1', batch, 'new:1')).toBe(factId('exec-1', batch, 'new:1'));
    expect(factId('exec-1', batch, 'new:1')).not.toBe(factId('exec-2', batch, 'new:1'));
    expect(factId('exec-1', batch, 'new:1')).not.toBe(
      factId('exec-1', batchKeyOf(['m-3']), 'new:1')
    );
  });

  it('round-trips KI URIs', () => {
    expect(kiIdFromUri(kiUri('mem-1'))).toBe('mem-1');
    expect(kiIdFromUri('index://logs')).toBeUndefined();
  });
});
