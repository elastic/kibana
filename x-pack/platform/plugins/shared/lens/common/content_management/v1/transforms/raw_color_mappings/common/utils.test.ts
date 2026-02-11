/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FormBasedLayer,
  FormBasedPersistedState,
  TextBasedPersistedState,
} from '../../../../../../public';
import type { TextBasedLayer } from '@kbn/lens-common';
import type { StructuredDatasourceStates } from '@kbn/lens-common';
import type { ColumnMeta } from './utils';
import { getColumnMetaFn } from './utils';

const layerId = 'layer-1';
const columnId = 'column-1';

const getDatasourceStatesMock = (
  type: keyof StructuredDatasourceStates,
  dataType?: ColumnMeta['dataType'],
  fieldType?: ColumnMeta['fieldType']
) => {
  if (type === 'formBased') {
    return {
      formBased: {
        layers: {
          [layerId]: {
            columns: {
              [columnId]: {
                dataType,
                params: {
                  parentFormat: { id: fieldType },
                },
              },
            },
          } as unknown as FormBasedLayer,
        },
      } satisfies FormBasedPersistedState,
    };
  }

  if (type === 'textBased') {
    return {
      textBased: {
        layers: {
          [layerId]: {
            columns: [{ columnId, meta: { type: dataType } }],
          } as unknown as TextBasedLayer,
        },
      } satisfies TextBasedPersistedState,
    };
  }
};

describe('utils', () => {
  describe('getColumnMetaFn', () => {
    const mockDataType = 'string';
    const mockFieldType = 'terms';

    it('should return null if neither type exists', () => {
      const mockDatasourceState = {};
      const resultFn = getColumnMetaFn(mockDatasourceState);

      expect(resultFn).toBeNull();
    });

    describe('formBased datasourceState', () => {
      it('should correct dataType and fieldType', () => {
        const mockDatasourceState = getDatasourceStatesMock(
          'formBased',
          mockDataType,
          mockFieldType
        );
        const resultFn = getColumnMetaFn(mockDatasourceState)!;
        const result = resultFn(layerId, [columnId]);

        expect(result.dataType).toBe(mockDataType);
        expect(result.fieldType).toBe(mockFieldType);
      });

      it('should undefined dataType and fieldType if column not found', () => {
        const mockDatasourceState = getDatasourceStatesMock('formBased');
        const resultFn = getColumnMetaFn(mockDatasourceState)!;
        const result = resultFn(layerId, ['bad-column']);

        expect(result.dataType).toBeUndefined();
        expect(result.fieldType).toBeUndefined();
      });

      it('should undefined dataType and fieldType if layer not found', () => {
        const mockDatasourceState = getDatasourceStatesMock('formBased');
        const resultFn = getColumnMetaFn(mockDatasourceState)!;
        const result = resultFn('bad-layer', [columnId]);

        expect(result.dataType).toBeUndefined();
        expect(result.fieldType).toBeUndefined();
      });

      it('should undefined dataType and fieldType if missing', () => {
        const mockDatasourceState = getDatasourceStatesMock('formBased');
        const resultFn = getColumnMetaFn(mockDatasourceState)!;
        const result = resultFn(layerId, [columnId]);

        expect(result.dataType).toBeUndefined();
        expect(result.fieldType).toBeUndefined();
      });
    });

    describe('textBased datasourceState', () => {
      it('should correct dataType and fieldType', () => {
        const mockDatasourceState = getDatasourceStatesMock(
          'textBased',
          mockDataType,
          mockFieldType
        );
        const resultFn = getColumnMetaFn(mockDatasourceState)!;
        const result = resultFn(layerId, [columnId]);

        expect(result.dataType).toBe(mockDataType);
        expect(result.fieldType).toBeUndefined(); // no fieldType needed for textBased
      });

      it('should undefined dataType and fieldType if column not found', () => {
        const mockDatasourceState = getDatasourceStatesMock('textBased');
        const resultFn = getColumnMetaFn(mockDatasourceState)!;
        const result = resultFn(layerId, ['bad-column']);

        expect(result.dataType).toBeUndefined();
        expect(result.fieldType).toBeUndefined();
      });

      it('should undefined dataType and fieldType if layer not found', () => {
        const mockDatasourceState = getDatasourceStatesMock('textBased');
        const resultFn = getColumnMetaFn(mockDatasourceState)!;
        const result = resultFn('bad-layer', [columnId]);

        expect(result.dataType).toBeUndefined();
        expect(result.fieldType).toBeUndefined();
      });

      it('should undefined dataType and fieldType if missing', () => {
        const mockDatasourceState = getDatasourceStatesMock('textBased');
        const resultFn = getColumnMetaFn(mockDatasourceState)!;
        const result = resultFn(layerId, [columnId]);

        expect(result.dataType).toBeUndefined();
        expect(result.fieldType).toBeUndefined();
      });
    });
  });
});
