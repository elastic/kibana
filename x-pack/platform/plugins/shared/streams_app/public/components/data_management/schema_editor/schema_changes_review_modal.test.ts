/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getChanges } from './schema_changes_review_modal';
import type { SchemaEditorField } from './types';
import {
  createMockMappedField,
  createMockUnmappedField,
  createMockInheritedField,
} from '../shared/mocks';

describe('getChanges', () => {
  describe('filtering unmapped type fields', () => {
    it('should not include new fields with type "unmapped" in added fields', () => {
      const unmappedTypeField: SchemaEditorField = {
        ...createMockMappedField({ name: 'documented_field' }),
        type: 'unmapped',
        description: 'This is a documentation-only field',
      };

      const regularField: SchemaEditorField = {
        ...createMockMappedField({ name: 'regular_field' }),
        type: 'keyword',
      };

      const fields: SchemaEditorField[] = [unmappedTypeField, regularField];
      const storedFields: SchemaEditorField[] = [];

      const changes = getChanges(fields, storedFields);

      // Should only include the regular field, not the unmapped type field
      expect(changes).toHaveLength(1);
      expect(changes[0].name).toBe('regular_field');
    });

    it('should not include changed fields with type "unmapped"', () => {
      const originalField: SchemaEditorField = {
        ...createMockMappedField({ name: 'documented_field' }),
        type: 'unmapped',
        description: 'Original description',
      };

      const updatedField: SchemaEditorField = {
        ...createMockMappedField({ name: 'documented_field' }),
        type: 'unmapped',
        description: 'Updated description',
      };

      const fields: SchemaEditorField[] = [updatedField];
      const storedFields: SchemaEditorField[] = [originalField];

      const changes = getChanges(fields, storedFields);

      // Should not include any changes since the field has type 'unmapped'
      expect(changes).toHaveLength(0);
    });

    it('should include regular mapped fields in added fields', () => {
      const newField: SchemaEditorField = {
        ...createMockMappedField({ name: 'new_keyword_field' }),
        type: 'keyword',
      };

      const fields: SchemaEditorField[] = [newField];
      const storedFields: SchemaEditorField[] = [];

      const changes = getChanges(fields, storedFields);

      expect(changes).toHaveLength(1);
      expect(changes[0].name).toBe('new_keyword_field');
      expect(changes[0].type).toBe('keyword');
    });

    it('should include regular mapped fields in changed fields', () => {
      const originalField: SchemaEditorField = {
        ...createMockMappedField({ name: 'existing_field' }),
        type: 'keyword',
      };

      const updatedField: SchemaEditorField = {
        ...createMockMappedField({ name: 'existing_field' }),
        type: 'long',
      };

      const fields: SchemaEditorField[] = [updatedField];
      const storedFields: SchemaEditorField[] = [originalField];

      const changes = getChanges(fields, storedFields);

      expect(changes).toHaveLength(1);
      expect(changes[0].name).toBe('existing_field');
      expect(changes[0].type).toBe('long');
    });
  });

  describe('field status handling', () => {
    it('should not include inherited fields', () => {
      const inheritedField: SchemaEditorField = createMockInheritedField({
        name: 'inherited_field',
        type: 'keyword',
      });

      const originalInheritedField: SchemaEditorField = {
        ...inheritedField,
        description: 'Different description',
      };

      const fields: SchemaEditorField[] = [inheritedField];
      const storedFields: SchemaEditorField[] = [originalInheritedField];

      const changes = getChanges(fields, storedFields);

      // Inherited fields should not appear in changes
      expect(changes).toHaveLength(0);
    });

    it('should include unmapped status fields that are new', () => {
      const unmappedStatusField: SchemaEditorField = createMockUnmappedField({
        name: 'new_unmapped_field',
      });

      const fields: SchemaEditorField[] = [unmappedStatusField];
      const storedFields: SchemaEditorField[] = [];

      const changes = getChanges(fields, storedFields);

      // Unmapped status fields (not unmapped type) should be included
      expect(changes).toHaveLength(1);
      expect(changes[0].name).toBe('new_unmapped_field');
      expect(changes[0].status).toBe('unmapped');
    });
  });

  describe('mixed scenarios', () => {
    it('should correctly filter multiple fields with mixed types', () => {
      const documentationOnlyField: SchemaEditorField = {
        ...createMockMappedField({ name: 'doc_field' }),
        type: 'unmapped',
        description: 'Documentation only',
      };

      const regularKeywordField: SchemaEditorField = {
        ...createMockMappedField({ name: 'keyword_field' }),
        type: 'keyword',
      };

      const regularDateField: SchemaEditorField = {
        ...createMockMappedField({ name: 'date_field' }),
        type: 'date',
      };

      const anotherDocField: SchemaEditorField = {
        ...createMockMappedField({ name: 'another_doc_field' }),
        type: 'unmapped',
        description: 'Another documentation field',
      };

      const fields: SchemaEditorField[] = [
        documentationOnlyField,
        regularKeywordField,
        regularDateField,
        anotherDocField,
      ];
      const storedFields: SchemaEditorField[] = [];

      const changes = getChanges(fields, storedFields);

      // Should only include the two regular fields
      expect(changes).toHaveLength(2);
      expect(changes.map((f) => f.name)).toEqual(
        expect.arrayContaining(['keyword_field', 'date_field'])
      );
      expect(changes.map((f) => f.name)).not.toContain('doc_field');
      expect(changes.map((f) => f.name)).not.toContain('another_doc_field');
    });

    it('should return empty array when all new fields are unmapped type', () => {
      const docField1: SchemaEditorField = {
        ...createMockMappedField({ name: 'doc_field_1' }),
        type: 'unmapped',
        description: 'Doc 1',
      };

      const docField2: SchemaEditorField = {
        ...createMockMappedField({ name: 'doc_field_2' }),
        type: 'unmapped',
        description: 'Doc 2',
      };

      const fields: SchemaEditorField[] = [docField1, docField2];
      const storedFields: SchemaEditorField[] = [];

      const changes = getChanges(fields, storedFields);

      expect(changes).toHaveLength(0);
    });
  });
});
