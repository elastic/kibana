/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../constants', () => ({ MAIN_DATA_TYPE_DEFINITION: {} }));

import uuid from 'uuid';
import { isStateValid, deNormalize } from './utils';
import { NormalizedFields, NormalizedField } from '../types';

const createFieldById = ({
  id,
  nestedDepth = 0,
  path,
  source,
  isMultiField = false,
  canHaveChildFields = false,
  canHaveMultiFields = false,
  isExpanded = false,
  childFieldsName = 'fields',
  hasChildFields = false,
  hasMultiFields = false,
  parentId,
}: NormalizedField) => {
  return {
    id,
    nestedDepth,
    path,
    source,
    isMultiField,
    canHaveChildFields,
    canHaveMultiFields,
    isExpanded,
    childFieldsName,
    hasChildFields,
    hasMultiFields,
    parentId,
  };
};

const createFieldMetadata = (type: string) => ({
  id: uuid.v4(),
  name: `${type}_field`,
  source: {
    name: `${type}_field`,
    type,
  },
});

describe('utils', () => {
  describe('deNormalize()', () => {
    const {
      id: rootBooleanFieldId,
      name: rootBooleanFieldName,
      source: rootBooleanSource,
    } = createFieldMetadata('boolean');

    const {
      id: rootKeywordFieldId,
      name: rootKeywordFieldName,
      source: rootKeywordSource,
    } = createFieldMetadata('keyword');

    const fieldsState = {
      rootLevelFields: [rootBooleanFieldId, rootKeywordFieldId],
      byId: {
        [rootBooleanFieldId]: createFieldById({
          id: rootBooleanFieldId,
          path: rootBooleanFieldName,
          source: rootBooleanSource,
        }),
        [rootKeywordFieldId]: createFieldById({
          id: rootKeywordFieldId,
          path: rootKeywordFieldName,
          source: rootKeywordSource,
        }),
      },
      aliases: {},
    } as NormalizedFields;

    it('handles base case', () => {
      const { name: booleanName, ...normalizedBooleanField } = rootBooleanSource;
      const { name: keywordName, ...normalizedKeywordField } = rootKeywordSource;
      expect(deNormalize(fieldsState)).toEqual({
        [rootBooleanFieldName]: normalizedBooleanField,
        [rootKeywordFieldName]: normalizedKeywordField,
      });
    });

    // it('handles alias field', () => {
    //   const { name, ...result } = source;
    //   expect(deNormalize(fieldsState)).toEqual({
    //     [fieldName]: result,
    //   });
    // });

    // it('handles child fields', () => {
    //   const { name, ...result } = source;
    //   expect(deNormalize(fieldsState)).toEqual({
    //     [fieldName]: result,
    //   });
    // });
  });
  describe('isStateValid()', () => {
    let components: any;
    it('handles base case', () => {
      components = {
        fieldsJsonEditor: { isValid: undefined },
        configuration: { isValid: undefined },
        fieldForm: undefined,
      };
      expect(isStateValid(components)).toBe(undefined);
    });

    it('handles combinations of true, false and undefined', () => {
      components = {
        fieldsJsonEditor: { isValid: false },
        configuration: { isValid: true },
        fieldForm: undefined,
      };

      expect(isStateValid(components)).toBe(false);

      components = {
        fieldsJsonEditor: { isValid: false },
        configuration: { isValid: undefined },
        fieldForm: undefined,
      };

      expect(isStateValid(components)).toBe(undefined);

      components = {
        fieldsJsonEditor: { isValid: true },
        configuration: { isValid: undefined },
        fieldForm: undefined,
      };

      expect(isStateValid(components)).toBe(undefined);

      components = {
        fieldsJsonEditor: { isValid: true },
        configuration: { isValid: false },
        fieldForm: undefined,
      };

      expect(isStateValid(components)).toBe(false);

      components = {
        fieldsJsonEditor: { isValid: false },
        configuration: { isValid: true },
        fieldForm: { isValid: true },
      };

      expect(isStateValid(components)).toBe(false);
    });
  });
});
