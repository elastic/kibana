/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assignCategoriesToPalette, dynamicRound } from './style_util';

describe('assignCategoriesToPalette', () => {
  test('Categories and icons have same length', () => {
    const categories = [
      { key: 'alpah', count: 1 },
      { key: 'bravo', count: 1 },
      { key: 'charlie', count: 1 },
      { key: 'delta', count: 1 },
    ];
    const paletteValues = ['circle', 'marker', 'triangle', 'square'];
    expect(assignCategoriesToPalette({ categories, paletteValues })).toEqual({
      stops: [
        {
          stop: 'alpah',
          style: 'circle',
          iconSource: 'MAKI',
        },
        {
          stop: 'bravo',
          style: 'marker',
          iconSource: 'MAKI',
        },
        {
          stop: 'charlie',
          style: 'triangle',
          iconSource: 'MAKI',
        },
      ],
      fallbackSymbolId: 'square',
    });
  });

  test('Should More categories than icon values', () => {
    const categories = [
      { key: 'alpah', count: 1 },
      { key: 'bravo', count: 1 },
      { key: 'charlie', count: 1 },
      { key: 'delta', count: 1 },
    ];
    const paletteValues = ['circle', 'square', 'triangle'];
    expect(assignCategoriesToPalette({ categories, paletteValues })).toEqual({
      stops: [
        {
          stop: 'alpah',
          style: 'circle',
          iconSource: 'MAKI',
        },
        {
          stop: 'bravo',
          style: 'square',
          iconSource: 'MAKI',
        },
      ],
      fallbackSymbolId: 'triangle',
    });
  });

  test('Less categories than icon values', () => {
    const categories = [
      { key: 'alpah', count: 1 },
      { key: 'bravo', count: 1 },
    ];
    const paletteValues = ['circle', 'triangle', 'marker', 'square', 'rectangle'];
    expect(assignCategoriesToPalette({ categories, paletteValues })).toEqual({
      stops: [
        {
          stop: 'alpah',
          style: 'circle',
          iconSource: 'MAKI',
        },
        {
          stop: 'bravo',
          style: 'triangle',
          iconSource: 'MAKI',
        },
      ],
      fallbackSymbolId: 'marker',
    });
  });
});

describe('dynamicRound', () => {
  test('Should truncate based on magnitude of number', () => {
    expect(dynamicRound(1000.1234)).toBe(1000);
    expect(dynamicRound(1.1234)).toBe(1.12);
    expect(dynamicRound(0.0012345678)).toBe(0.00123);
  });

  test('Should return argument when not a number', () => {
    expect(dynamicRound('foobar')).toBe('foobar');
  });
});
