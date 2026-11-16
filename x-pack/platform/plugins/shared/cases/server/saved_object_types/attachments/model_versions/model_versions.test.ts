/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { modelVersion1 } from './model_version_1';
import { modelVersion2 } from './model_version_2';

describe('cases-attachments model versions', () => {
  describe('version 1', () => {
    it('is the model-version baseline (no schema or mapping changes)', () => {
      expect(modelVersion1.changes).toEqual([]);
    });
  });

  describe('version 2', () => {
    it('indexes the observable fields inside data', () => {
      expect(modelVersion2.changes).toEqual([
        {
          type: 'mappings_addition',
          addedMappings: {
            data: {
              properties: {
                typeKey: { type: 'keyword', ignore_above: 1024 },
                value: { type: 'keyword', ignore_above: 1024 },
                description: { type: 'keyword', ignore_above: 1024 },
                legacyId: { type: 'keyword', ignore_above: 1024 },
              },
            },
          },
        },
      ]);
    });

    it('accepts observable data on create', () => {
      expect(() =>
        modelVersion2.schemas.create.validate({
          type: 'observable',
          owner: 'securitySolution',
          data: { typeKey: 'observable-type-ipv4', value: '10.0.0.1', description: null },
          created_at: '2026-11-04T00:00:00.000Z',
          created_by: { username: 'elastic' },
        })
      ).not.toThrow();
    });

    it('accepts the legacy id of a migrated observable', () => {
      expect(() =>
        modelVersion2.schemas.create.validate({
          type: 'observable',
          owner: 'securitySolution',
          data: {
            typeKey: 'observable-type-ipv4',
            value: '10.0.0.1',
            description: null,
            legacyId: 'a9f6c5f0-2b4e-4d0a-9c1b-3e5f7a9b1c2d',
          },
          created_at: '2026-11-04T00:00:00.000Z',
          created_by: { username: null },
        })
      ).not.toThrow();
    });
  });
});
