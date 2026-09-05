/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { modelVersion1 } from './model_version_1';
import { modelVersion2 } from './model_version_2';

describe('cases-user-actions model versions', () => {
  describe('version 1', () => {
    it('is the model-version baseline (no mapping changes)', () => {
      expect(modelVersion1.changes).toEqual([]);
    });
  });

  describe('version 2', () => {
    it('adds the source mapping', () => {
      expect(modelVersion2.changes).toEqual([
        {
          type: 'mappings_addition',
          addedMappings: {
            source: {
              properties: {
                type: { type: 'keyword', ignore_above: 1024 },
              },
            },
          },
        },
      ]);
    });

    it('accepts an unknown source.type in forwardCompatibility', () => {
      const schema = modelVersion2.schemas?.forwardCompatibility;
      if (typeof schema === 'function') {
        throw new Error('expected an object schema, got a function');
      }

      const attrs = {
        action: 'create',
        created_at: '2020-01-01T00:00:00.000Z',
        created_by: { username: 'elastic' },
        owner: 'cases',
        type: 'comment',
        source: { type: 'some_future_source', id: '1' },
      };

      expect(() => schema?.validate(attrs)).not.toThrow();
    });

    it('rejects an unknown source.type in create', () => {
      const schema = modelVersion2.schemas?.create;
      if (!schema) {
        throw new Error('expected a create schema');
      }

      const attrs = {
        action: 'create',
        created_at: '2020-01-01T00:00:00.000Z',
        created_by: { username: 'elastic' },
        owner: 'cases',
        type: 'comment',
        source: { type: 'some_future_source', id: '1' },
      };

      expect(() => schema.validate(attrs)).toThrow();
    });
  });
});
