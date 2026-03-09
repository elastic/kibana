/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateUniqueName } from './validators';
import type { NormalizedFields } from '../types';

const createNormalizedFields = (
  fieldNames: string[]
): Pick<NormalizedFields, 'rootLevelFields' | 'byId'> => {
  const byId: NormalizedFields['byId'] = {};
  const rootLevelFields: string[] = [];

  fieldNames.forEach((name, index) => {
    const id = `field-${index}`;
    rootLevelFields.push(id);
    byId[id] = {
      id,
      source: { name, type: 'keyword' },
      parentId: undefined,
      isMultiField: false,
      childFields: [],
      childFieldsName: undefined,
      canHaveChildFields: false,
      hasChildFields: false,
      canHaveMultiFields: false,
      hasMultiFields: false,
      isExpanded: false,
      nestedDepth: 0,
      path: [name],
    } as unknown as NormalizedFields['byId'][string];
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

    it('SHOULD prioritize pending field error over mapping view error', () => {
      const pendingFields = createNormalizedFields(['duplicate']);
      const mappingViewFields = createNormalizedFields(['duplicate']);
      const validator = validateUniqueName(pendingFields, undefined, undefined, mappingViewFields);
      const result = validator({ value: 'duplicate' } as any);
      expect(result).toEqual({
        message: 'There is already a field with this name.',
      });
    });
  });
});
