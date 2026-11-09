/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_MENTIONS_PER_ATTACHMENT } from '../../../../common/constants';
import { modelVersion1 } from './model_version_1';
import { modelVersion2 } from './model_version_2';

describe('cases-attachments model versions', () => {
  describe('version 1', () => {
    it('is the model-version baseline (no schema or mapping changes)', () => {
      expect(modelVersion1.changes).toEqual([]);
    });
  });

  describe('version 2', () => {
    const getCreateSchema = () => {
      const schema = modelVersion2.schemas?.create;
      if (!schema) {
        throw new Error('expected a create schema');
      }
      return schema;
    };
    const base = {
      type: 'comment',
      owner: 'cases',
      data: { content: 'hello' },
      created_at: '2026-11-09T00:00:00.000Z',
      created_by: { username: 'elastic' },
    };

    it('adds the parent_id, mentions and deleted mappings', () => {
      expect(modelVersion2.changes).toEqual([
        {
          type: 'mappings_addition',
          addedMappings: {
            parent_id: { type: 'keyword', ignore_above: 1024 },
            mentions: { type: 'keyword', ignore_above: 1024 },
            deleted: { type: 'boolean' },
          },
        },
      ]);
    });

    it('accepts the new fields', () => {
      expect(() =>
        getCreateSchema().validate({ ...base, parent_id: 'p1', mentions: ['u1'], deleted: true })
      ).not.toThrow();
    });

    it('rejects too many mentions', () => {
      const mentions = Array.from({ length: MAX_MENTIONS_PER_ATTACHMENT + 1 }, (_, i) => `u${i}`);
      expect(() => getCreateSchema().validate({ ...base, mentions })).toThrow();
    });
  });
});
