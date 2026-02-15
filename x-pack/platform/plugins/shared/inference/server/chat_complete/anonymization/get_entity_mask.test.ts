/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityMask } from './get_entity_mask';

describe('getEntityMask', () => {
  const entity = { class_name: 'HOST_NAME', value: 'my-server-01' };

  describe('with salt (deterministic tokenization)', () => {
    const salt = 'test-space-secret';

    it('returns a token with the entity class prefix', () => {
      const mask = getEntityMask(entity, salt);

      expect(mask).toMatch(/^HOST_NAME_[a-f0-9]+$/);
    });

    it('returns the same mask for the same inputs (deterministic)', () => {
      const mask1 = getEntityMask(entity, salt);
      const mask2 = getEntityMask(entity, salt);

      expect(mask1).toBe(mask2);
    });

    it('returns different masks for different salts (cross-space isolation)', () => {
      const mask1 = getEntityMask(entity, 'space-1-secret');
      const mask2 = getEntityMask(entity, 'space-2-secret');

      expect(mask1).not.toBe(mask2);
    });

    it('returns different masks for different values', () => {
      const mask1 = getEntityMask({ class_name: 'HOST_NAME', value: 'server-a' }, salt);
      const mask2 = getEntityMask({ class_name: 'HOST_NAME', value: 'server-b' }, salt);

      expect(mask1).not.toBe(mask2);
    });
  });

  describe('without salt (legacy fallback)', () => {
    it('returns a token with the entity class prefix', () => {
      const mask = getEntityMask(entity);

      expect(mask).toMatch(/^HOST_NAME_/);
    });

    it('returns the same mask for the same inputs (deterministic)', () => {
      const mask1 = getEntityMask(entity);
      const mask2 = getEntityMask(entity);

      expect(mask1).toBe(mask2);
    });

    it('returns different masks for different values', () => {
      const mask1 = getEntityMask({ class_name: 'HOST_NAME', value: 'server-a' });
      const mask2 = getEntityMask({ class_name: 'HOST_NAME', value: 'server-b' });

      expect(mask1).not.toBe(mask2);
    });
  });
});
