/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  auditbeatNoResults,
  auditbeatWithAllResults,
} from '../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { packetbeatWithSomeErrors } from '../mock/pattern_rollup/mock_packetbeat_pattern_rollup';
import { mockStatsPacketbeatIndex } from '../mock/stats/mock_stats_auditbeat_index';
import { mockStatsAuditbeatIndex } from '../mock/stats/mock_stats_packetbeat_index';
import { DataQualityCheckResult } from '../types';
import {
  getDocsCount,
  getDocsCountPercent,
  getSizeInBytes,
  getTotalPatternIncompatible,
  getTotalPatternIndicesChecked,
} from './stats';

describe('getTotalPatternIndicesChecked', () => {
  test('it returns zero when `patternRollup` is undefined', () => {
    expect(getTotalPatternIndicesChecked(undefined)).toEqual(0);
  });

  test('it returns zero when `patternRollup` does NOT have any results', () => {
    expect(getTotalPatternIndicesChecked(auditbeatNoResults)).toEqual(0);
  });

  test('it returns the expected total when all indices in `patternRollup` have results', () => {
    expect(getTotalPatternIndicesChecked(auditbeatWithAllResults)).toEqual(3);
  });

  test('it returns the expected total when some indices in `patternRollup` have errors', () => {
    expect(getTotalPatternIndicesChecked(packetbeatWithSomeErrors)).toEqual(1);
  });
});

describe('getDocsCount', () => {
  test('it returns the expected docs count when `stats` contains the `indexName`', () => {
    const indexName = '.ds-packetbeat-8.6.1-2023.02.04-000001';
    const expectedCount = mockStatsPacketbeatIndex[indexName].num_docs;

    expect(
      getDocsCount({
        indexName,
        stats: mockStatsPacketbeatIndex,
      })
    ).toEqual(expectedCount);
  });

  test('it returns zero when `stats` does NOT contain the `indexName`', () => {
    const indexName = 'not-gonna-find-it';

    expect(
      getDocsCount({
        indexName,
        stats: mockStatsPacketbeatIndex,
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
        stats: mockStatsAuditbeatIndex,
      })
    ).toEqual(mockStatsAuditbeatIndex[indexName].num_docs);
  });
});

describe('getSizeInBytes', () => {
  test('it returns the expected size when `stats` contains the `indexName`', () => {
    const indexName = '.ds-packetbeat-8.6.1-2023.02.04-000001';
    const expectedCount = mockStatsPacketbeatIndex[indexName].size_in_bytes;

    expect(
      getSizeInBytes({
        indexName,
        stats: mockStatsPacketbeatIndex,
      })
    ).toEqual(expectedCount);
  });

  test('it returns undefined when `stats` does NOT contain the `indexName`', () => {
    const indexName = 'not-gonna-find-it';

    expect(
      getSizeInBytes({
        indexName,
        stats: mockStatsPacketbeatIndex,
      })
    ).toBeUndefined();
  });

  test('it returns undefined when `stats` is null', () => {
    const indexName = '.ds-packetbeat-8.6.1-2023.02.04-000001';

    expect(
      getSizeInBytes({
        indexName,
        stats: null,
      })
    ).toBeUndefined();
  });

  test('it returns the expected size for a green index, where `primaries.store.size_in_bytes` and `total.store.size_in_bytes` have different values', () => {
    const indexName = 'auditbeat-custom-index-1';

    expect(
      getSizeInBytes({
        indexName,
        stats: mockStatsAuditbeatIndex,
      })
    ).toEqual(mockStatsAuditbeatIndex[indexName].size_in_bytes);
  });
});

describe('getTotalPatternIncompatible', () => {
  test('it returns zero when multiple indices in the results results have a count of zero', () => {
    const results: Record<string, DataQualityCheckResult> = {
      '.ds-packetbeat-8.5.3-2023.02.04-000001': {
        docsCount: 1630289,
        error: null,
        ilmPhase: 'hot',
        incompatible: 0,
        indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
        markdownComments: ['foo', 'bar', 'baz'],
        pattern: 'packetbeat-*',
        sameFamily: 0,
        checkedAt: Date.now(),
      },
      '.ds-packetbeat-8.6.1-2023.02.04-000001': {
        docsCount: 1628343,
        error: null,
        ilmPhase: 'hot',
        incompatible: 0,
        indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
        markdownComments: ['foo', 'bar', 'baz'],
        pattern: 'packetbeat-*',
        sameFamily: 0,
        checkedAt: Date.now(),
      },
    };

    expect(getTotalPatternIncompatible(results)).toEqual(0);
  });

  test("it returns the expected total when some indices have incompatible fields, but others don't", () => {
    const results: Record<string, DataQualityCheckResult> = {
      '.ds-auditbeat-8.6.1-2023.02.07-000001': {
        docsCount: 18086,
        error: null,
        ilmPhase: 'hot',
        incompatible: 0,
        indexName: '.ds-auditbeat-8.6.1-2023.02.07-000001',
        markdownComments: ['foo', 'bar', 'baz'],
        pattern: 'auditbeat-*',
        sameFamily: 0,
        checkedAt: Date.now(),
      },
      'auditbeat-custom-index-1': {
        docsCount: 4,
        error: null,
        ilmPhase: 'unmanaged',
        incompatible: 3,
        indexName: 'auditbeat-custom-index-1',
        markdownComments: ['foo', 'bar', 'baz'],
        pattern: 'auditbeat-*',
        sameFamily: 0,
        checkedAt: Date.now(),
      },
      'auditbeat-custom-empty-index-1': {
        docsCount: 0,
        error: null,
        ilmPhase: 'unmanaged',
        incompatible: 1,
        indexName: 'auditbeat-custom-empty-index-1',
        markdownComments: ['foo', 'bar', 'baz'],
        pattern: 'auditbeat-*',
        sameFamily: 0,
        checkedAt: Date.now(),
      },
    };

    expect(getTotalPatternIncompatible(results)).toEqual(4);
  });

  test('it returns the expected total when some indices have undefined incompatible counts', () => {
    const results: Record<string, DataQualityCheckResult> = {
      '.ds-auditbeat-8.6.1-2023.02.07-000001': {
        docsCount: 18086,
        error: null,
        ilmPhase: 'hot',
        incompatible: undefined, // <-- this index has an undefined `incompatible`
        indexName: '.ds-auditbeat-8.6.1-2023.02.07-000001',
        markdownComments: ['foo', 'bar', 'baz'],
        pattern: 'auditbeat-*',
        sameFamily: 0,
        checkedAt: Date.now(),
      },
      'auditbeat-custom-index-1': {
        docsCount: 4,
        error: null,
        ilmPhase: 'unmanaged',
        incompatible: 3,
        indexName: 'auditbeat-custom-index-1',
        markdownComments: ['foo', 'bar', 'baz'],
        pattern: 'auditbeat-*',
        sameFamily: 0,
        checkedAt: Date.now(),
      },
      'auditbeat-custom-empty-index-1': {
        docsCount: 0,
        error: null,
        ilmPhase: 'unmanaged',
        incompatible: 1,
        indexName: 'auditbeat-custom-empty-index-1',
        markdownComments: ['foo', 'bar', 'baz'],
        pattern: 'auditbeat-*',
        sameFamily: 0,
        checkedAt: Date.now(),
      },
    };

    expect(getTotalPatternIncompatible(results)).toEqual(4);
  });

  test('it returns zero when `results` is empty', () => {
    expect(getTotalPatternIncompatible({})).toEqual(0);
  });

  test('it returns undefined when `results` is undefined', () => {
    expect(getTotalPatternIncompatible(undefined)).toBeUndefined();
  });
});

describe('getDocsCountPercent', () => {
  test('it returns an empty string when `patternDocsCount` is zero', () => {
    expect(
      getDocsCountPercent({
        docsCount: 0,
        patternDocsCount: 0,
      })
    ).toEqual('');
  });

  test('it returns the expected format when when `patternDocsCount` is non-zero, and `locales` is undefined', () => {
    expect(
      getDocsCountPercent({
        docsCount: 2904,
        locales: undefined,
        patternDocsCount: 57410,
      })
    ).toEqual('5.1%');
  });

  test('it returns the expected format when when `patternDocsCount` is non-zero, and `locales` is provided', () => {
    expect(
      getDocsCountPercent({
        docsCount: 2904,
        locales: 'en-US',
        patternDocsCount: 57410,
      })
    ).toEqual('5.1%');
  });
});
