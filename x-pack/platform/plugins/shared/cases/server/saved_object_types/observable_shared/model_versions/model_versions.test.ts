/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { modelVersion1 } from './model_version_1';

const validAttributes = {
  owner: 'securitySolution',
  type_key: 'observable-type-ipv4',
  value: '10.0.0.8',
  metadata: { triage: 'confirmed' },
  created_at: '2026-11-09T09:30:00.000Z',
  created_by: { username: 'analyst', full_name: null, email: null },
  updated_at: null,
  updated_by: null,
};

describe('cases-observable-shared model versions', () => {
  describe('version 1', () => {
    it('is the model-version baseline (no mapping changes)', () => {
      expect(modelVersion1.changes).toEqual([]);
    });

    it('accepts a shared object with every mapped field', () => {
      expect(() => modelVersion1.schemas?.create?.validate(validAttributes)).not.toThrow();
    });

    it('rejects more than 20 metadata pairs', () => {
      const metadata = Object.fromEntries(
        Array.from({ length: 21 }, (_, i) => [`key-${i}`, `value-${i}`])
      );
      expect(() =>
        modelVersion1.schemas?.create?.validate({ ...validAttributes, metadata })
      ).toThrow();
    });

    it('rejects a metadata value longer than 1,024 characters', () => {
      expect(() =>
        modelVersion1.schemas?.create?.validate({
          ...validAttributes,
          metadata: { triage: 'x'.repeat(1025) },
        })
      ).toThrow();
    });
  });
});
