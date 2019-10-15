/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getIndexPatternTitleIdMapping, getIndexPatternTitles } from './helpers';
import { mockIndexPatternSavedObjects } from './__mock__/api';

describe('helpers', () => {
  describe('getIndexPatternTitles', () => {
    test('returns empty array when no index patterns are provided', () => {
      const indexPatternTitles = getIndexPatternTitles([]);
      expect(indexPatternTitles.length).toEqual(0);
    });

    test('returns titles when index patterns are provided', () => {
      const indexPatternTitles = getIndexPatternTitles(mockIndexPatternSavedObjects);
      expect(indexPatternTitles).toEqual(['filebeat-*', 'auditbeat-*']);
    });
  });

  describe('getIndexPatternTitleIdMapping', () => {
    test('returns empty array when no index patterns are provided', () => {
      const indexPatternTitleIdMapping = getIndexPatternTitleIdMapping([]);
      expect(indexPatternTitleIdMapping.length).toEqual(0);
    });

    test('returns correct mapping when index patterns are provided', () => {
      const indexPatternTitleIdMapping = getIndexPatternTitleIdMapping(
        mockIndexPatternSavedObjects
      );
      expect(indexPatternTitleIdMapping).toEqual([
        { id: '2d1fe420-eeee-11e9-ad95-4b5e687c2aee', title: 'filebeat-*' },
        { id: '5463ec70-c7ba-ffff-ad95-4b5e687c2aee', title: 'auditbeat-*' },
      ]);
    });
  });
});
