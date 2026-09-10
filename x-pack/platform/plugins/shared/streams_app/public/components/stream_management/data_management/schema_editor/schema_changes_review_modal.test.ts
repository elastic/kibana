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
  describe('filtering doc-only fields', () => {
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

    it('should not include doc-only overrides (unmapped status, no type) as mapping changes', () => {
      const unmappedStatusField: SchemaEditorField = createMockUnmappedField({
        name: 'new_unmapped_field',
      });

      const fields: SchemaEditorField[] = [unmappedStatusField];
      const storedFields: SchemaEditorField[] = [];

      const changes = getChanges(fields, storedFields);

      expect(changes).toHaveLength(0);
    });
  });

  describe('mixed scenarios', () => {
    it('should correctly filter multiple fields with mixed types', () => {
      const documentationOnlyField: SchemaEditorField = createMockUnmappedField({
        name: 'doc_field',
        description: 'Documentation only',
      });

      const regularKeywordField: SchemaEditorField = {
        ...createMockMappedField({ name: 'keyword_field' }),
        type: 'keyword',
      };

      const regularDateField: SchemaEditorField = {
        ...createMockMappedField({ name: 'date_field' }),
        type: 'date',
      };

      const anotherDocField: SchemaEditorField = createMockUnmappedField({
        name: 'another_doc_field',
        description: 'Another documentation field',
      });

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

    it('should return empty array when all new fields are doc-only', () => {
      const docField1: SchemaEditorField = createMockUnmappedField({
        name: 'doc_field_1',
        description: 'Doc 1',
      });

      const docField2: SchemaEditorField = createMockUnmappedField({
        name: 'doc_field_2',
        description: 'Doc 2',
      });

      const fields: SchemaEditorField[] = [docField1, docField2];
      const storedFields: SchemaEditorField[] = [];

      const changes = getChanges(fields, storedFields);

      expect(changes).toHaveLength(0);
    });
  });

  describe('description-only changes', () => {
    it('should not include mapped fields when only the description changed', () => {
      const originalField: SchemaEditorField = {
        ...createMockMappedField({ name: 'existing_field' }),
        type: 'keyword',
        description: 'Original description',
      };

      const updatedField: SchemaEditorField = {
        ...createMockMappedField({ name: 'existing_field' }),
        type: 'keyword',
        description: 'Updated description',
      };

      const changes = getChanges([updatedField], [originalField]);
      expect(changes).toHaveLength(0);
    });

    it('should include a field when a real mapping override is removed (mapped -> unmapped)', () => {
      const originalField: SchemaEditorField = {
        ...createMockMappedField({ name: 'field_to_unmap' }),
        type: 'keyword',
      };

      const updatedField: SchemaEditorField = {
        ...createMockUnmappedField({ name: 'field_to_unmap' }),
      };

      const changes = getChanges([updatedField], [originalField]);
      expect(changes).toHaveLength(1);
      expect(changes[0].name).toBe('field_to_unmap');
      expect(changes[0].status).toBe('unmapped');
    });
  });

  describe('type unmapped handling (description-only override for wired streams)', () => {
    it('should not include fields with type="unmapped" as mapping changes', () => {
      // When a user adds a description-only override in a wired stream, the field
      // has status='mapped' but type='unmapped'. This represents a doc-only override
      // that doesn't affect ES mappings.
      const unmappedTypeField: SchemaEditorField = {
        ...createMockMappedField({ name: 'doc_only_field' }),
        type: 'unmapped',
        description: 'Documentation for this field',
      };

      const fields: SchemaEditorField[] = [unmappedTypeField];
      const storedFields: SchemaEditorField[] = [];

      const changes = getChanges(fields, storedFields);

      // type='unmapped' fields should not be considered mapping changes
      expect(changes).toHaveLength(0);
    });

    it('should return empty array when all fields have type="unmapped"', () => {
      const unmappedTypeField1: SchemaEditorField = {
        ...createMockMappedField({ name: 'doc_field_1' }),
        type: 'unmapped',
        description: 'Doc 1',
      };

      const unmappedTypeField2: SchemaEditorField = {
        ...createMockMappedField({ name: 'doc_field_2' }),
        type: 'unmapped',
        description: 'Doc 2',
      };

      const fields: SchemaEditorField[] = [unmappedTypeField1, unmappedTypeField2];
      const storedFields: SchemaEditorField[] = [];

      const changes = getChanges(fields, storedFields);

      // Modal should not be shown since no mapping-affecting changes
      expect(changes).toHaveLength(0);
    });

    it('should only include real mapping changes, not type="unmapped" fields', () => {
      const unmappedTypeField: SchemaEditorField = {
        ...createMockMappedField({ name: 'doc_only_field' }),
        type: 'unmapped',
        description: 'Documentation only',
      };

      const realMappedField: SchemaEditorField = {
        ...createMockMappedField({ name: 'real_keyword_field' }),
        type: 'keyword',
      };

      const fields: SchemaEditorField[] = [unmappedTypeField, realMappedField];
      const storedFields: SchemaEditorField[] = [];

      const changes = getChanges(fields, storedFields);

      // Should only include the real keyword field
      expect(changes).toHaveLength(1);
      expect(changes[0].name).toBe('real_keyword_field');
      expect(changes[0].type).toBe('keyword');
    });

    it('should include the change when transitioning from type="unmapped" to a real type', () => {
      // A field that previously only had a description now gets a real mapping
      const originalField: SchemaEditorField = {
        ...createMockMappedField({ name: 'field' }),
        type: 'unmapped',
        description: 'Was just documentation',
      };

      const updatedField: SchemaEditorField = {
        ...createMockMappedField({ name: 'field' }),
        type: 'keyword',
        description: 'Now has a real mapping',
      };

      const changes = getChanges([updatedField], [originalField]);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('keyword');
    });

    it('should include the change when transitioning from real type to type="unmapped"', () => {
      const originalField: SchemaEditorField = {
        ...createMockMappedField({ name: 'field' }),
        type: 'keyword',
      };

      const updatedField: SchemaEditorField = {
        ...createMockMappedField({ name: 'field' }),
        type: 'unmapped',
        description: 'Converted to doc-only',
      };

      const changes = getChanges([updatedField], [originalField]);

      // This IS a mapping change because we're removing the keyword mapping
      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('unmapped');
    });
  });
});
