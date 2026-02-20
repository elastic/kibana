/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getChanges } from './schema_changes_review_modal';
import type { SchemaEditorField } from './types';
import { createMockMappedField, createMockUnmappedField } from '../shared/mocks';

/**
 * Unit tests for getChanges function from SchemaChangesReviewModal.
 *
 * Note: Full component tests are challenging due to the async nature of the modal's
 * simulation effects and the complex mocking requirements. The getChanges function
 * is tested here as it contains the core change detection logic.
 *
 * Integration tests for the field conflicts warning UI should be covered by the
 * Scout UI tests in x-pack/platform/plugins/shared/streams_app/test/scout/ui/
 */
describe('SchemaChangesReviewModal', () => {
  describe('getChanges', () => {
    it('returns added mapped fields', () => {
      const fields: SchemaEditorField[] = [
        createMockMappedField({ name: 'new.field', parent: 'logs.test' }) as SchemaEditorField,
      ];
      const storedFields: SchemaEditorField[] = [];

      const changes = getChanges(fields, storedFields);

      expect(changes).toHaveLength(1);
      expect(changes[0].name).toBe('new.field');
    });

    it('returns added unmapped fields', () => {
      const fields: SchemaEditorField[] = [
        createMockUnmappedField({
          name: 'unmapped.field',
          parent: 'logs.test',
        }) as SchemaEditorField,
      ];
      const storedFields: SchemaEditorField[] = [];

      const changes = getChanges(fields, storedFields);

      expect(changes).toHaveLength(1);
      expect(changes[0].name).toBe('unmapped.field');
      expect(changes[0].status).toBe('unmapped');
    });

    it('returns changed fields when type differs', () => {
      const fields: SchemaEditorField[] = [
        createMockMappedField({
          name: 'existing.field',
          type: 'long',
          parent: 'logs.test',
        }) as SchemaEditorField,
      ];
      const storedFields: SchemaEditorField[] = [
        createMockMappedField({
          name: 'existing.field',
          type: 'keyword',
          parent: 'logs.test',
        }) as SchemaEditorField,
      ];

      const changes = getChanges(fields, storedFields);

      expect(changes).toHaveLength(1);
      expect(changes[0].name).toBe('existing.field');
      expect(changes[0].type).toBe('long');
    });

    it('returns empty array when fields are unchanged', () => {
      const field = createMockMappedField({
        name: 'same.field',
        type: 'keyword',
        parent: 'logs.test',
      }) as SchemaEditorField;
      const fields: SchemaEditorField[] = [field];
      const storedFields: SchemaEditorField[] = [{ ...field }];

      const changes = getChanges(fields, storedFields);

      expect(changes).toHaveLength(0);
    });

    it('excludes inherited fields from changes', () => {
      const fields: SchemaEditorField[] = [
        {
          name: 'inherited.field',
          type: 'keyword',
          status: 'inherited',
          parent: 'logs.parent',
        } as SchemaEditorField,
      ];
      const storedFields: SchemaEditorField[] = [];

      const changes = getChanges(fields, storedFields);

      expect(changes).toHaveLength(0);
    });

    it('returns multiple added fields', () => {
      const fields: SchemaEditorField[] = [
        createMockMappedField({ name: 'field.one', parent: 'logs.test' }) as SchemaEditorField,
        createMockMappedField({ name: 'field.two', parent: 'logs.test' }) as SchemaEditorField,
        createMockMappedField({ name: 'field.three', parent: 'logs.test' }) as SchemaEditorField,
      ];
      const storedFields: SchemaEditorField[] = [];

      const changes = getChanges(fields, storedFields);

      expect(changes).toHaveLength(3);
      expect(changes.map((c) => c.name)).toEqual(['field.one', 'field.two', 'field.three']);
    });

    it('returns both added and changed fields', () => {
      const fields: SchemaEditorField[] = [
        createMockMappedField({ name: 'new.field', parent: 'logs.test' }) as SchemaEditorField,
        createMockMappedField({
          name: 'existing.field',
          type: 'long',
          parent: 'logs.test',
        }) as SchemaEditorField,
      ];
      const storedFields: SchemaEditorField[] = [
        createMockMappedField({
          name: 'existing.field',
          type: 'keyword',
          parent: 'logs.test',
        }) as SchemaEditorField,
      ];

      const changes = getChanges(fields, storedFields);

      expect(changes).toHaveLength(2);
      expect(changes.map((c) => c.name)).toContain('new.field');
      expect(changes.map((c) => c.name)).toContain('existing.field');
    });

    it('does not return unchanged stored fields', () => {
      const unchangedField = createMockMappedField({
        name: 'unchanged.field',
        type: 'keyword',
        parent: 'logs.test',
      }) as SchemaEditorField;

      const fields: SchemaEditorField[] = [
        { ...unchangedField },
        createMockMappedField({ name: 'new.field', parent: 'logs.test' }) as SchemaEditorField,
      ];
      const storedFields: SchemaEditorField[] = [{ ...unchangedField }];

      const changes = getChanges(fields, storedFields);

      expect(changes).toHaveLength(1);
      expect(changes[0].name).toBe('new.field');
    });

    it('detects status change from unmapped to mapped', () => {
      const fields: SchemaEditorField[] = [
        createMockMappedField({
          name: 'field.to.map',
          type: 'keyword',
          parent: 'logs.test',
        }) as SchemaEditorField,
      ];
      const storedFields: SchemaEditorField[] = [
        createMockUnmappedField({
          name: 'field.to.map',
          parent: 'logs.test',
        }) as SchemaEditorField,
      ];

      const changes = getChanges(fields, storedFields);

      expect(changes).toHaveLength(1);
      expect(changes[0].name).toBe('field.to.map');
      expect(changes[0].status).toBe('mapped');
    });

    it('handles empty fields array', () => {
      const fields: SchemaEditorField[] = [];
      const storedFields: SchemaEditorField[] = [
        createMockMappedField({
          name: 'existing.field',
          parent: 'logs.test',
        }) as SchemaEditorField,
      ];

      const changes = getChanges(fields, storedFields);

      expect(changes).toHaveLength(0);
    });

    it('handles both empty arrays', () => {
      const fields: SchemaEditorField[] = [];
      const storedFields: SchemaEditorField[] = [];

      const changes = getChanges(fields, storedFields);

      expect(changes).toHaveLength(0);
    });
  });
});
