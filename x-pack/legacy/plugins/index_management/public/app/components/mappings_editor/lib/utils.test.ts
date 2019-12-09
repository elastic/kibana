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
  childFields,
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
    childFields,
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
    it('handles base case', () => {
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

      const { name: booleanName, ...normalizedBooleanField } = rootBooleanSource;
      const { name: keywordName, ...normalizedKeywordField } = rootKeywordSource;

      expect(deNormalize(fieldsState)).toEqual({
        [rootBooleanFieldName]: normalizedBooleanField,
        [rootKeywordFieldName]: normalizedKeywordField,
      });
    });

    it('handles alias field', () => {
      const {
        id: rootAliasFieldId,
        name: rootAliasFieldName,
        source: rootAliasSource,
      } = createFieldMetadata('alias');

      const {
        id: rootKeywordFieldId,
        name: rootKeywordFieldName,
        source: rootKeywordSource,
      } = createFieldMetadata('keyword');

      const fieldsState = {
        rootLevelFields: [rootAliasFieldId, rootKeywordFieldId],
        byId: {
          [rootAliasFieldId]: createFieldById({
            id: rootAliasFieldId,
            path: rootAliasFieldName,
            source: rootAliasSource,
          }),
          [rootKeywordFieldId]: createFieldById({
            id: rootKeywordFieldId,
            path: rootKeywordFieldName,
            source: rootKeywordSource,
          }),
        },
        aliases: {
          [rootKeywordFieldId]: [rootAliasFieldId],
        },
      } as NormalizedFields;

      const { name: keywordName, ...normalizedKeywordField } = rootKeywordSource;

      expect(deNormalize(fieldsState)).toEqual({
        [rootAliasFieldName]: {
          path: keywordName,
          type: 'alias',
        },
        [rootKeywordFieldName]: normalizedKeywordField,
      });
    });

    it('handles child fields', () => {
      const {
        id: rootObjectFieldId,
        name: rootObjectFieldName,
        source: rootObjectSource,
      } = createFieldMetadata('object');

      const {
        id: childTextFieldId,
        name: childTextFieldName,
        source: childTextFieldSource,
      } = createFieldMetadata('text');

      const fieldsState = {
        rootLevelFields: [rootObjectFieldId],
        byId: {
          [rootObjectFieldId]: createFieldById({
            id: rootObjectFieldId,
            path: rootObjectFieldName,
            source: rootObjectSource,
            canHaveChildFields: true,
            childFieldsName: 'properties',
            childFields: [childTextFieldId],
          }),
          [childTextFieldId]: createFieldById({
            id: childTextFieldId,
            path: childTextFieldName,
            source: childTextFieldSource,
          }),
        },
        aliases: {},
      } as NormalizedFields;

      const { name: textName, ...normalizedTextField } = childTextFieldSource;

      expect(deNormalize(fieldsState)).toEqual({
        [rootObjectFieldName]: {
          type: 'object',
          properties: {
            [textName]: normalizedTextField,
          },
        },
      });
    });
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
