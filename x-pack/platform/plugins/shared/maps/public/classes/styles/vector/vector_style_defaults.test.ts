/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../kibana_services', () => {
  return {
    getIsDarkMode() {
      return false;
    },
  };
});

import { VECTOR_STYLES } from '../../../../common/constants';
import { getDefaultStaticProperties } from './vector_style_defaults';

describe('getDefaultStaticProperties', () => {
  test('Should use first color in DEFAULT_*_COLORS when no colors are used on the map', () => {
    const styleProperties = getDefaultStaticProperties([]);
    expect(styleProperties[VECTOR_STYLES.FILL_COLOR].options.color).toBe('#16C5C0');
    expect(styleProperties[VECTOR_STYLES.LINE_COLOR].options.color).toBe('#119793');
  });

  test('Should next color in DEFAULT_*_COLORS when colors are used on the map', () => {
    const styleProperties = getDefaultStaticProperties(['#54B399']);
    expect(styleProperties[VECTOR_STYLES.FILL_COLOR].options.color).toBe('#16C5C0');
    expect(styleProperties[VECTOR_STYLES.LINE_COLOR].options.color).toBe('#119793');
  });
});
