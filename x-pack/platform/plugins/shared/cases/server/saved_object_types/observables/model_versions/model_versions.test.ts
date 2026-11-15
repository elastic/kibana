/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { modelVersion1 } from './model_version_1';

describe('cases-observables model versions', () => {
  describe('version 1', () => {
    it('is the model-version baseline (no mapping changes)', () => {
      expect(modelVersion1.changes).toEqual([]);
    });

    it('accepts an observable with every mapped field', () => {
      expect(() =>
        modelVersion1.schemas?.create?.validate({
          owner: 'securitySolution',
          type_key: 'observable-type-ipv4',
          value: '10.0.0.8',
          description: null,
          source_attachment_id: null,
          created_at: '2026-11-06T09:30:00.000Z',
          created_by: { username: 'analyst', full_name: null, email: null },
          updated_at: null,
          updated_by: null,
        })
      ).not.toThrow();
    });

    it('rejects an observable without a type key', () => {
      expect(() =>
        modelVersion1.schemas?.create?.validate({
          owner: 'securitySolution',
          value: '10.0.0.8',
          description: null,
          created_at: '2026-11-06T09:30:00.000Z',
          created_by: { username: 'analyst' },
        })
      ).toThrow();
    });
  });
});
