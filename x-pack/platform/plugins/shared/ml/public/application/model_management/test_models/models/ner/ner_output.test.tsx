/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';

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
    const mockEuiTheme = {
      colors: {
        vis: {
          euiColorVis0: '#00B3A4',
          euiColorVis1: '#3185FC',
          euiColorVis5: '#DB1374',
          euiColorVis7: '#490092',
        },
      },
    } as EuiThemeComputed;

    test('returns the correct color for class PER', () => {
      expect(getClassColor(mockEuiTheme, 'PER')).toBe('#DB1374');
    });

    test('returns the correct color for class LOC', () => {
      expect(getClassColor(mockEuiTheme, 'LOC')).toBe('#3185FC');
    });

    test('returns the correct color for class ORG', () => {
      expect(getClassColor(mockEuiTheme, 'ORG')).toBe('#00B3A4');
    });

    test('returns the correct color for class MISC', () => {
      expect(getClassColor(mockEuiTheme, 'MISC')).toBe('#490092');
    });

    test('returns the default color for an unknown class', () => {
      expect(getClassColor(mockEuiTheme, 'UNKNOWN')).toBe('#DB1374');
    });
  });
});
