/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../constants', () => ({ MAIN_DATA_TYPE_DEFINITION: {} }));

import uuid from 'uuid';
import { isStateValid, deNormalize } from './utils';
import { NormalizedFields, NormalizedField } from '../types';

const createField = ({
  id,
  nestedDepth = 0,
  path,
  source,
  isMultiField = false,
  canHaveChildFields = false,
}: NormalizedField) => {
  return {
    id,
    nestedDepth,
    path,
    source,
    isMultiField,
    canHaveChildFields,
  };
};

describe('utils', () => {
  describe('deNormalize()', () => {
    const rootField1Id = uuid.v4();
    const fieldName = 'my_field';
    const source = {
      doc_values: true,
      index: true,
      name: fieldName,
      null_value: 'true',
      store: false,
      type: 'boolean',
    };
    const fieldsState = {
      rootLevelFields: [rootField1Id],
      byId: {
        [rootField1Id]: {
          id: rootField1Id,
          nestedDepth: 0,
          path: fieldName,
          source,
          isMultiField: false,
          canHaveChildFields: false,
        },
      },
      aliases: {},
    } as NormalizedFields;

    it('handles base case', () => {
      const { name, ...result } = source;
      expect(deNormalize(fieldsState)).toEqual({
        [fieldName]: result,
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
