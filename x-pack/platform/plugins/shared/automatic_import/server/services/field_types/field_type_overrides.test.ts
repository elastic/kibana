/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  applyFieldTypeOverrides,
  collectRuleErrors,
  mergeFieldTypeChanges,
  refreshFieldTypeOverrides,
} from './field_type_overrides';
import { InvalidFieldTypeChangeError } from '../../errors';

describe('field type overrides', () => {
  describe('collectRuleErrors', () => {
    it('reports only certain failures', () => {
      expect(
        collectRuleErrors(
          [
            { name: 'size', type: 'byte', original_type: 'long' },
            { name: 'label', type: 'date', original_type: 'keyword' },
          ],
          [{ size: 300, label: '2024-03-05' }, { size: 1 }]
        )
      ).toEqual([
        { name: 'size', issue: 'out_of_range', failing_documents: 1, total_documents: 2 },
      ]);
    });

    it('checks values of fields inside arrays of objects', () => {
      expect(
        collectRuleErrors(
          [
            { name: 'rules.id', type: 'long', original_type: 'keyword' },
            { name: 'rules.port', type: 'long', original_type: 'keyword' },
          ],
          [
            {
              rules: [
                { id: 'abc', port: 22 },
                { id: 'def', port: 443 },
              ],
            },
            { rules: [{ id: 'ghi' }] },
          ]
        )
      ).toEqual([
        { name: 'rules.id', issue: 'not_numeric', failing_documents: 2, total_documents: 2 },
      ]);
    });
  });

  describe('refreshFieldTypeOverrides', () => {
    it('refreshes original types and drops edits for missing, ECS, and object fields', () => {
      expect(
        refreshFieldTypeOverrides(
          [
            { name: 'port', type: 'keyword', is_ecs: false },
            { name: 'bytes', type: 'long', is_ecs: false },
            { name: 'size', type: 'keyword', is_ecs: false },
            { name: 'source.ip', type: 'ip', is_ecs: true },
            { name: 'vendor', type: 'group', is_ecs: false },
          ],
          [
            { name: 'port', type: 'long', original_type: 'keyword' },
            { name: 'bytes', type: 'keyword', original_type: 'keyword' },
            { name: 'size', type: 'long', original_type: 'double' },
            { name: 'source.ip', type: 'keyword', original_type: 'ip' },
            { name: 'vendor', type: 'keyword', original_type: 'group' },
            { name: 'gone', type: 'long', original_type: 'keyword' },
          ]
        )
      ).toEqual({
        overrides: [
          { name: 'port', type: 'long', original_type: 'keyword' },
          { name: 'bytes', type: 'keyword', original_type: 'long' },
          { name: 'size', type: 'long', original_type: 'keyword' },
        ],
        dropped: ['source.ip', 'vendor', 'gone'],
      });
    });

    it('removes edits the pipeline now produces on its own', () => {
      expect(
        refreshFieldTypeOverrides(
          [{ name: 'port', type: 'long', is_ecs: false }],
          [{ name: 'port', type: 'long', original_type: 'keyword' }]
        )
      ).toEqual({ overrides: [], dropped: [] });
    });
  });

  describe('applyFieldTypeOverrides', () => {
    it('applies edits and skips ECS fields and fields absent from the mappings', () => {
      expect(
        applyFieldTypeOverrides(
          [
            { name: 'port', type: 'keyword', is_ecs: false },
            { name: 'source.ip', type: 'ip', is_ecs: true },
          ],
          [
            { name: 'port', type: 'long', original_type: 'keyword' },
            { name: 'source.ip', type: 'keyword', original_type: 'ip' },
            { name: 'gone', type: 'long', original_type: 'keyword' },
          ]
        )
      ).toEqual({
        fieldMapping: [
          { name: 'port', type: 'long', is_ecs: false },
          { name: 'source.ip', type: 'ip', is_ecs: true },
        ],
        overrides: [{ name: 'port', type: 'long', original_type: 'keyword' }],
      });
    });

    it('restores the original type on reverted fields', () => {
      expect(
        applyFieldTypeOverrides(
          [{ name: 'loc', type: 'keyword', is_ecs: false }],
          [],
          [{ name: 'loc', originalType: 'geo_point' }]
        )
      ).toEqual({
        fieldMapping: [{ name: 'loc', type: 'geo_point', is_ecs: false }],
        overrides: [],
      });
    });
  });

  describe('mergeFieldTypeChanges', () => {
    const mappings = [
      { name: 'port', type: 'keyword', is_ecs: false },
      { name: 'loc', type: 'keyword', is_ecs: false },
      { name: '@timestamp', type: 'date', is_ecs: true },
    ];

    it('reverts to an unsupported original type by removing the override', () => {
      expect(
        mergeFieldTypeChanges(
          mappings,
          [{ name: 'loc', type: 'keyword', original_type: 'geo_point' }],
          [{ name: 'loc', type: 'geo_point' }]
        )
      ).toEqual({
        overrides: [],
        reverted: [{ name: 'loc', originalType: 'geo_point' }],
      });
    });

    it('rejects an unsupported type that is not the original', () => {
      expect(() =>
        mergeFieldTypeChanges(mappings, [], [{ name: 'port', type: 'geo_point' }])
      ).toThrow(InvalidFieldTypeChangeError);
    });

    it('rejects ECS fields', () => {
      expect(() =>
        mergeFieldTypeChanges(mappings, [], [{ name: '@timestamp', type: 'keyword' }])
      ).toThrow(InvalidFieldTypeChangeError);
    });

    it('rejects duplicate changes for the same field', () => {
      expect(() =>
        mergeFieldTypeChanges(
          mappings,
          [],
          [
            { name: 'port', type: 'long' },
            { name: 'port', type: 'integer' },
          ]
        )
      ).toThrow('Field port was changed more than once');
    });
  });
});
