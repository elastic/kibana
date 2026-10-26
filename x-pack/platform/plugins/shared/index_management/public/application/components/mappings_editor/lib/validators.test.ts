/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateUniqueName } from './validators';
import type { NormalizedField, NormalizedFields } from '../types';

const createField = (id: string, name: string, parentId?: string): NormalizedField => ({
  id,
  source: { name, type: 'keyword' },
  parentId,
  isMultiField: false,
  childFieldsName: undefined,
  canHaveChildFields: false,
  hasChildFields: false,
  canHaveMultiFields: false,
  hasMultiFields: false,
  childFields: [],
  isExpanded: false,
  nestedDepth: parentId ? 1 : 0,
  path: parentId ? ['parent', name] : [name],
});

const createNormalizedFields = (
  fieldNames: string[],
  parentId?: string
): Pick<NormalizedFields, 'rootLevelFields' | 'byId'> => {
  const byId: NormalizedFields['byId'] = {};
  const rootLevelFields: string[] = [];

  fieldNames.forEach((name, index) => {
    const id = `field-${index}`;
    if (!parentId) {
      rootLevelFields.push(id);
    }
    byId[id] = createField(id, name, parentId);
  });

  return { byId, rootLevelFields };
};

describe('validateUniqueName', () => {
  describe('WHEN checking against pending fields', () => {
    it('SHOULD return error if name already exists in pending fields', () => {
      const fields = createNormalizedFields(['existing_field']);
      const validator = validateUniqueName(fields, undefined, undefined);
      const result = validator({ value: 'existing_field' } as any);
      expect(result).toEqual({
        message: 'There is already a field with this name.',
      });
    });

    it('SHOULD allow the same name as initialName (editing existing field)', () => {
      const fields = createNormalizedFields(['existing_field']);
      const validator = validateUniqueName(fields, 'existing_field', undefined);
      const result = validator({ value: 'existing_field' } as any);
      expect(result).toBeUndefined();
    });

    it('SHOULD allow a unique name', () => {
      const fields = createNormalizedFields(['existing_field']);
      const validator = validateUniqueName(fields, undefined, undefined);
      const result = validator({ value: 'new_field' } as any);
      expect(result).toBeUndefined();
    });
  });

  describe('WHEN checking against existing index mappings', () => {
    it('SHOULD return error if name exists in mappingViewFields', () => {
      const pendingFields = createNormalizedFields([]);
      const mappingViewFields = createNormalizedFields(['index_field']);
      const validator = validateUniqueName(pendingFields, undefined, undefined, mappingViewFields);
      const result = validator({ value: 'index_field' } as any);
      expect(result).toEqual({
        message:
          'A field with this name already exists in the index. Use a different name or edit the existing field.',
      });
    });

    it('SHOULD allow a name that does not exist in mappingViewFields', () => {
      const pendingFields = createNormalizedFields([]);
      const mappingViewFields = createNormalizedFields(['index_field']);
      const validator = validateUniqueName(pendingFields, undefined, undefined, mappingViewFields);
      const result = validator({ value: 'brand_new_field' } as any);
      expect(result).toBeUndefined();
    });

    it('SHOULD not check mappingViewFields when not provided', () => {
      const pendingFields = createNormalizedFields([]);
      const validator = validateUniqueName(pendingFields, undefined, undefined);
      const result = validator({ value: 'any_name' } as any);
      expect(result).toBeUndefined();
    });

    it('SHOULD return error for nested field name that exists under the same parent', () => {
      const parentId = 'parent-field';
      const pendingFields = createNormalizedFields([]);
      const mappingViewFields = createNormalizedFields(['child_field'], parentId);
      const validator = validateUniqueName(pendingFields, undefined, parentId, mappingViewFields);
      const result = validator({ value: 'child_field' } as any);
      expect(result).toEqual({
        message:
          'A field with this name already exists in the index. Use a different name or edit the existing field.',
      });
    });

    it('SHOULD allow nested field name that does not exist under the same parent', () => {
      const parentId = 'parent-field';
      const pendingFields = createNormalizedFields([]);
      const mappingViewFields = createNormalizedFields(['child_field'], parentId);
      const validator = validateUniqueName(pendingFields, undefined, parentId, mappingViewFields);
      const result = validator({ value: 'new_child' } as any);
      expect(result).toBeUndefined();
    });
  });
});
