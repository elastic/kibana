/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDocsCount, getTotalDocsCount } from './helpers';
import { mockStatsGreenIndex } from './mock/stats/mock_stats_green_index';
import { mockStatsYellowIndex } from './mock/stats/mock_stats_yellow_index';

describe('helpers', () => {
  describe('getDocsCount', () => {
    test('it returns the expected docs count when `stats` contains the `indexName`', () => {
      const indexName = '.ds-packetbeat-8.6.1-2023.02.04-000001';
      const expectedCount = mockStatsYellowIndex[indexName].primaries?.docs?.count;

      expect(
        getDocsCount({
          indexName,
          stats: mockStatsYellowIndex,
        })
      ).toEqual(expectedCount);
    });

    test('it returns zero when `stats` does NOT contain the `indexName`', () => {
      const indexName = 'not-gonna-find-it';

      expect(
        getDocsCount({
          indexName,
          stats: mockStatsYellowIndex,
        })
      ).toEqual(0);
    });

    test('it returns zero when `stats` is null', () => {
      const indexName = '.ds-packetbeat-8.6.1-2023.02.04-000001';

      expect(
        getDocsCount({
          indexName,
          stats: null,
        })
      ).toEqual(0);
    });

    test('it returns the expected total for a green index, where `primaries.docs.count` and `total.docs.count` have different values', () => {
      const indexName = 'auditbeat-custom-index-1';

      expect(
        getDocsCount({
          indexName,
          stats: mockStatsGreenIndex,
        })
      ).toEqual(mockStatsGreenIndex[indexName].primaries?.docs?.count);
    });
  });

  describe('getTotalDocsCount', () => {
    test('it returns the expected total given a subset of index names in the stats', () => {
      const indexName = '.ds-packetbeat-8.5.3-2023.02.04-000001';
      const expectedCount = mockStatsYellowIndex[indexName].primaries?.docs?.count;

      expect(
        getTotalDocsCount({
          indexNames: [indexName],
          stats: mockStatsYellowIndex,
        })
      ).toEqual(expectedCount);
    });

    test('it returns the expected total given all index names in the stats', () => {
      const allIndexNamesInStats = [
        '.ds-packetbeat-8.6.1-2023.02.04-000001',
        '.ds-packetbeat-8.5.3-2023.02.04-000001',
      ];

      expect(
        getTotalDocsCount({
          indexNames: allIndexNamesInStats,
          stats: mockStatsYellowIndex,
        })
      ).toEqual(3258632);
    });

    test('it returns zero given an empty collection of index names', () => {
      expect(
        getTotalDocsCount({
          indexNames: [], // <-- empty
          stats: mockStatsYellowIndex,
        })
      ).toEqual(0);
    });

    test('it returns the expected total for a green index', () => {
      const indexName = 'auditbeat-custom-index-1';
      const expectedCount = mockStatsGreenIndex[indexName].primaries?.docs?.count;

      expect(
        getTotalDocsCount({
          indexNames: [indexName],
          stats: mockStatsGreenIndex,
        })
      ).toEqual(expectedCount);
    });
  });
});
