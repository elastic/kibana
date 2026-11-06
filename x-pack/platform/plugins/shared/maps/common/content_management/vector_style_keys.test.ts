/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformVectorStyleKeysIn, transformVectorStyleKeysOut } from './vector_style_keys';

const storedLayer = {
  id: 'a',
  style: {
    type: 'VECTOR',
    properties: {
      fillColor: { type: 'STATIC', options: { color: '#fff' } },
      labelBorderSize: { options: { size: 'SMALL' } },
    },
  },
};
const layer = {
  id: 'a',
  style: {
    type: 'VECTOR',
    properties: {
      fill_color: { type: 'STATIC', options: { color: '#fff' } },
      label_border_size: { options: { size: 'SMALL' } },
    },
  },
};

describe('vector style keys', () => {
  test('out converts stored camelCase keys to snake_case', () => {
    expect(transformVectorStyleKeysOut(storedLayer)).toEqual(layer);
  });

  test('out leaves already snake_case keys alone', () => {
    expect(transformVectorStyleKeysOut(layer)).toEqual(layer);
  });

  test('in converts snake_case keys to stored camelCase', () => {
    expect(transformVectorStyleKeysIn(layer)).toEqual(storedLayer);
  });

  test('layers without style properties are unchanged', () => {
    const noStyle = { id: 'b' };
    expect(transformVectorStyleKeysOut(noStyle)).toBe(noStyle);
    expect(transformVectorStyleKeysIn(noStyle)).toBe(noStyle);
  });
});
