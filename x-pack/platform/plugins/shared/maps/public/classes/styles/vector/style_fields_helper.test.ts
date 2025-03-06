/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_ORIGIN, VECTOR_STYLES } from '../../../../common/constants';
import { createStyleFieldsHelper, StyleFieldsHelper } from './style_fields_helper';
import { IField } from '../../fields/field';

describe('StyleFieldHelper', () => {
  describe('isFieldDataTypeCompatibleWithStyleType', () => {
    async function createHelper(supportsFieldMetaFromLocalData: boolean): Promise<{
      styleFieldHelper: StyleFieldsHelper;
      stringField: IField;
      numberField: IField;
      dateField: IField;
    }> {
      const stringField = {
        getDataType: async () => {
          return 'string';
        },
        getLabel: async () => {
          return 'foobar_string_label';
        },
        getName: () => {
          return 'foobar_string';
        },
        getOrigin: () => {
          return FIELD_ORIGIN.SOURCE;
        },
        supportsFieldMetaFromLocalData: () => {
          return supportsFieldMetaFromLocalData;
        },
        supportsFieldMetaFromEs: () => {
          return false;
        },
      } as unknown as IField;
      const numberField = {
        getDataType: async () => {
          return 'number';
        },
        getLabel: async () => {
          return 'foobar_number_label';
        },
        getName: () => {
          return 'foobar_number';
        },
        getOrigin: () => {
          return FIELD_ORIGIN.SOURCE;
        },
        supportsFieldMetaFromLocalData: () => {
          return supportsFieldMetaFromLocalData;
        },
        supportsFieldMetaFromEs: () => {
          return false;
        },
      } as unknown as IField;
      const dateField = {
        getDataType: async () => {
          return 'date';
        },
        getLabel: async () => {
          return 'foobar_date_label';
        },
        getName: () => {
          return 'foobar_date';
        },
        getOrigin: () => {
          return FIELD_ORIGIN.SOURCE;
        },
        supportsFieldMetaFromLocalData: () => {
          return supportsFieldMetaFromLocalData;
        },
        supportsFieldMetaFromEs: () => {
          return false;
        },
      } as unknown as IField;
      return {
        styleFieldHelper: await createStyleFieldsHelper([stringField, numberField, dateField]),
        stringField,
        numberField,
        dateField,
      };
    }

    test('Should validate colors for all data types', async () => {
      const { styleFieldHelper, stringField, numberField, dateField } = await createHelper(true);

      [
        VECTOR_STYLES.FILL_COLOR,
        VECTOR_STYLES.LINE_COLOR,
        VECTOR_STYLES.LABEL_COLOR,
        VECTOR_STYLES.LABEL_BORDER_COLOR,
      ].forEach((styleType) => {
        expect(styleFieldHelper.hasFieldForStyle(stringField, styleType)).toEqual(true);
        expect(styleFieldHelper.hasFieldForStyle(numberField, styleType)).toEqual(true);
        expect(styleFieldHelper.hasFieldForStyle(dateField, styleType)).toEqual(true);
      });
    });

    test('Should validate sizes for all number types', async () => {
      const { styleFieldHelper, stringField, numberField, dateField } = await createHelper(true);

      [VECTOR_STYLES.LINE_WIDTH, VECTOR_STYLES.LABEL_SIZE, VECTOR_STYLES.ICON_SIZE].forEach(
        (styleType) => {
          expect(styleFieldHelper.hasFieldForStyle(stringField, styleType)).toEqual(false);
          expect(styleFieldHelper.hasFieldForStyle(numberField, styleType)).toEqual(true);
          expect(styleFieldHelper.hasFieldForStyle(dateField, styleType)).toEqual(true);
        }
      );
    });

    test('Should not validate sizes if autodomain is not enabled', async () => {
      const { styleFieldHelper, stringField, numberField, dateField } = await createHelper(false);

      [VECTOR_STYLES.LINE_WIDTH, VECTOR_STYLES.LABEL_SIZE, VECTOR_STYLES.ICON_SIZE].forEach(
        (styleType) => {
          expect(styleFieldHelper.hasFieldForStyle(stringField, styleType)).toEqual(false);
          expect(styleFieldHelper.hasFieldForStyle(numberField, styleType)).toEqual(false);
          expect(styleFieldHelper.hasFieldForStyle(dateField, styleType)).toEqual(false);
        }
      );
    });

    test('Should validate orientation only number types', async () => {
      const { styleFieldHelper, stringField, numberField, dateField } = await createHelper(true);

      [VECTOR_STYLES.ICON_ORIENTATION].forEach((styleType) => {
        expect(styleFieldHelper.hasFieldForStyle(stringField, styleType)).toEqual(false);
        expect(styleFieldHelper.hasFieldForStyle(numberField, styleType)).toEqual(true);
        expect(styleFieldHelper.hasFieldForStyle(dateField, styleType)).toEqual(false);
      });
    });

    test('Should not validate label_border_size', async () => {
      const { styleFieldHelper, stringField, numberField, dateField } = await createHelper(true);

      [VECTOR_STYLES.LABEL_BORDER_SIZE].forEach((styleType) => {
        expect(styleFieldHelper.hasFieldForStyle(stringField, styleType)).toEqual(false);
        expect(styleFieldHelper.hasFieldForStyle(numberField, styleType)).toEqual(false);
        expect(styleFieldHelper.hasFieldForStyle(dateField, styleType)).toEqual(false);
      });
    });
  });
});
