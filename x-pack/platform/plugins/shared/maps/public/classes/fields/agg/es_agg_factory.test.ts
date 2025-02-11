/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esAggFieldsFactory } from './es_agg_factory';
import { AGG_TYPE, FIELD_ORIGIN } from '../../../../common/constants';
import { IESAggSource } from '../../sources/es_agg_source';

const mockEsAggSource = {
  getAggKey() {
    return 'foobar';
  },
} as unknown as IESAggSource;

describe('esAggFieldsFactory', () => {
  test('Should only create top terms field when term field is not provided', () => {
    const fields = esAggFieldsFactory(
      { type: AGG_TYPE.TERMS },
      mockEsAggSource,
      FIELD_ORIGIN.SOURCE
    );
    expect(fields.length).toBe(1);
  });

  test('Should create top terms and top terms percentage fields', () => {
    const fields = esAggFieldsFactory(
      { type: AGG_TYPE.TERMS, field: 'myField' },
      mockEsAggSource,
      FIELD_ORIGIN.SOURCE
    );
    expect(fields.length).toBe(2);
  });

  describe('percentile-fields', () => {
    test('Should create percentile agg fields with default', () => {
      const fields = esAggFieldsFactory(
        { type: AGG_TYPE.PERCENTILE, field: 'myField' },
        mockEsAggSource,
        FIELD_ORIGIN.SOURCE
      );
      expect(fields.length).toBe(1);
      expect(fields[0].getName()).toBe('foobar_50');
    });

    test('Should create percentile agg fields with param', () => {
      const fields = esAggFieldsFactory(
        { type: AGG_TYPE.PERCENTILE, field: 'myField', percentile: 90 },
        mockEsAggSource,
        FIELD_ORIGIN.SOURCE
      );
      expect(fields.length).toBe(1);
      expect(fields[0].getName()).toBe('foobar_90');
    });
  });
});
