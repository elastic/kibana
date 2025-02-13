/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getClassColor, getClassLabel, getClassIcon } from './ner_output';

describe('NER output', () => {
  describe('getClassIcon', () => {
    test('returns the correct icon for class PER', () => {
      expect(getClassIcon('PER')).toBe('user');
    });

    test('returns the correct icon for class LOC', () => {
      expect(getClassIcon('LOC')).toBe('visMapCoordinate');
    });

    test('returns the correct icon for class ORG', () => {
      expect(getClassIcon('ORG')).toBe('home');
    });

    test('returns the correct icon for class MISC', () => {
      expect(getClassIcon('MISC')).toBe('questionInCircle');
    });

    test('returns the default icon for an unknown class', () => {
      expect(getClassIcon('UNKNOWN')).toBe('questionInCircle');
    });
  });

  describe('getClassLabel', () => {
    test('returns the correct label for class PER', () => {
      expect(getClassLabel('PER')).toBe('Person');
    });

    test('returns the correct label for class LOC', () => {
      expect(getClassLabel('LOC')).toBe('Location');
    });

    test('returns the correct label for class ORG', () => {
      expect(getClassLabel('ORG')).toBe('Organization');
    });

    test('returns the correct label for class MISC', () => {
      expect(getClassLabel('MISC')).toBe('Miscellaneous');
    });

    test('returns the class name for an unknown class', () => {
      expect(getClassLabel('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('getClassColor', () => {
    test('returns the correct color for class PER', () => {
      expect(getClassColor('PER', true)).toBe('#ffe0f5');
    });

    test('returns the correct color for class LOC', () => {
      expect(getClassColor('LOC', true)).toBe('#bfffff');
    });

    test('returns the correct color for class ORG', () => {
      expect(getClassColor('ORG', true)).toBe('#45ded9');
    });

    test('returns the correct color for class MISC', () => {
      expect(getClassColor('MISC', true)).toBe('#ffe2db');
    });

    test('returns the default color for an unknown class', () => {
      expect(getClassColor('UNKNOWN', true)).toBe('#ffe0f5');
    });
  });
});
