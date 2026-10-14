/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectModelDataBackfillFn,
  SavedObjectsModelDataBackfillChange,
} from '@kbn/core-saved-objects-server';
import { modelVersion2, templateSchemaV2 } from './model_version_2';

interface TemplateAttributes {
  fieldNames?: unknown;
  fieldDefinitions?: unknown;
}

// Exercise the real backfill from the model version rather than a re-implementation.
const dataBackfillChange = modelVersion2.changes.find(
  (change): change is SavedObjectsModelDataBackfillChange => change.type === 'data_backfill'
);
const backfillFn = dataBackfillChange?.backfillFn as SavedObjectModelDataBackfillFn<
  TemplateAttributes,
  TemplateAttributes
>;

const runBackfill = (attributes: TemplateAttributes) => {
  const doc = { id: 'template-1', type: 'cases-templates', attributes } as Parameters<
    typeof backfillFn
  >[0];
  const context = {} as Parameters<typeof backfillFn>[1];

  return backfillFn(doc, context) as { attributes: TemplateAttributes };
};

describe('templates model version 2', () => {
  it('registers mappings_addition, mappings_deprecation and data_backfill changes', () => {
    expect(modelVersion2.changes.map((change) => change.type)).toEqual([
      'mappings_addition',
      'mappings_deprecation',
      'data_backfill',
    ]);
  });

  describe('data_backfill', () => {
    it('normalizes legacy 9.4 keyword string arrays into field definition objects', () => {
      const { attributes } = runBackfill({ fieldNames: ['Severity', 'Priority'] });

      expect(attributes.fieldDefinitions).toEqual([
        { name: 'Severity', label: 'Severity', type: '', control: '' },
        { name: 'Priority', label: 'Priority', type: '', control: '' },
      ]);
    });

    it('passes through 9.5 BC2 object arrays unchanged', () => {
      const objects = [
        { name: 'priority', label: 'Priority', type: 'keyword', control: 'SELECT_BASIC' },
      ];

      const { attributes } = runBackfill({ fieldNames: objects });

      expect(attributes.fieldDefinitions).toEqual(objects);
    });

    it('coerces malformed objects missing name/label so downstream readers stay safe', () => {
      const { attributes } = runBackfill({
        fieldNames: [{ label: 'Priority', type: 'keyword' }, { name: 'severity' }],
      });

      expect(attributes.fieldDefinitions).toEqual([
        { name: '', label: 'Priority', type: 'keyword', control: '' },
        { name: 'severity', label: '', type: '', control: '' },
      ]);
    });

    it('produces field definitions that satisfy the v2 schema', () => {
      const { attributes } = runBackfill({ fieldNames: ['Severity'] });

      expect(() =>
        templateSchemaV2.validate({
          templateId: 'template-1',
          name: 'Template',
          owner: 'securitySolution',
          definition: '',
          templateVersion: 1,
          deletedAt: null,
          fieldDefinitions: attributes.fieldDefinitions,
        })
      ).not.toThrow();
    });

    it('is a no-op when fieldDefinitions is already populated', () => {
      const { attributes } = runBackfill({
        fieldNames: ['Severity'],
        fieldDefinitions: [{ name: 'severity', label: 'Severity', type: 'keyword', control: 'X' }],
      });

      expect(attributes).toEqual({});
    });

    it('is a no-op when there is no legacy fieldNames value', () => {
      const { attributes } = runBackfill({});

      expect(attributes).toEqual({});
    });

    it('produces empty field definitions for a non-array legacy value', () => {
      const { attributes } = runBackfill({ fieldNames: 'unexpected' });

      expect(attributes.fieldDefinitions).toEqual([]);
    });
  });
});
