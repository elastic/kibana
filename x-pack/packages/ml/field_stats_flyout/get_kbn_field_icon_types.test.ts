/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKbnFieldIconType } from './get_kbn_field_icon_types';
import { ES_FIELD_TYPES } from '@kbn/field-types';

describe('getKbnFieldIconType', () => {
  it('should return "number" for numeric field types', () => {
    const numericTypes = [
      ES_FIELD_TYPES.FLOAT,
      ES_FIELD_TYPES.HALF_FLOAT,
      ES_FIELD_TYPES.SCALED_FLOAT,
      ES_FIELD_TYPES.DOUBLE,
      ES_FIELD_TYPES.INTEGER,
      ES_FIELD_TYPES.LONG,
      ES_FIELD_TYPES.SHORT,
      ES_FIELD_TYPES.UNSIGNED_LONG,
    ];

    numericTypes.forEach((type) => {
      expect(getKbnFieldIconType(type)).toBe('number');
    });
  });

  it('should return "date" for date field types', () => {
    const dateTypes = [ES_FIELD_TYPES.DATE, ES_FIELD_TYPES.DATE_NANOS];

    dateTypes.forEach((type) => {
      expect(getKbnFieldIconType(type)).toBe('date');
    });
  });

  it('should return the same type for other field types', () => {
    const otherTypes = ['keyword', 'text', 'boolean', 'geo_point', 'geo_shape'];

    otherTypes.forEach((type) => {
      expect(getKbnFieldIconType(type)).toBe(type);
    });
  });
});
