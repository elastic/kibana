/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertIndexWithAllResults } from '../../../mock/pattern_rollup/mock_alerts_pattern_rollup';
import { auditbeatWithAllResults } from '../../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import {
  mockPacketbeatPatternRollup,
  packetbeatNoResults,
  packetbeatWithSomeErrors,
} from '../../../mock/pattern_rollup/mock_packetbeat_pattern_rollup';
import { mockStats } from '../../../mock/stats/mock_stats';
import { DataQualityCheckResult, PatternRollup } from '../../../types';
import {
  getIndexDocsCountFromRollup,
  getIndexId,
  getTotalDocsCount,
  getTotalIncompatible,
  getTotalIndices,
  getTotalIndicesChecked,
  getTotalPatternSameFamily,
  getTotalSameFamily,
} from './stats';

const patternRollups: Record<string, PatternRollup> = {
  'auditbeat-*': auditbeatWithAllResults, // indices: 3
  'packetbeat-*': mockPacketbeatPatternRollup, // indices: 2
};

describe('getTotalPatternSameFamily', () => {
  const baseResult: DataQualityCheckResult = {
    docsCount: 4,
    error: null,
    ilmPhase: 'unmanaged',
    incompatible: 3,
    indexName: 'auditbeat-custom-index-1',
    markdownComments: [
      '### auditbeat-custom-index-1\n',
      '| Result | Index | Docs | Incompatible fields | ILM Phase |\n|--------|-------|------|---------------------|-----------|\n| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 | `unmanaged` |\n\n',
      '### **Incompatible fields** `3` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
      "#### 3 incompatible fields, 0 fields with mappings in the same family\n\nFields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version 8.6.1.\n\nIncompatible fields with mappings in the same family have exactly the same search behavior but may have different space usage or performance characteristics.\n\nWhen an incompatible field is not in the same family:\n❌ Detection engine rules referencing these fields may not match them correctly\n❌ Pages may not display some events or fields due to unexpected field mappings or values\n❌ Mappings or field values that don't comply with ECS are not supported\n",
      '\n#### Incompatible field mappings - auditbeat-custom-index-1\n\n\n| Field | ECS mapping type (expected) | Index mapping type (actual) | \n|-------|-----------------------------|-----------------------------|\n| host.name | `keyword` | `text`  |\n| source.ip | `ip` | `text`  |\n\n#### Incompatible field values - auditbeat-custom-index-1\n\n\n| Field | ECS values (expected) | Document values (actual) | \n|-------|-----------------------|--------------------------|\n| event.category | `authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web` | `an_invalid_category` (2),\n`theory` (1) |\n\n',
    ],
    pattern: 'auditbeat-*',
    sameFamily: 0,
    checkedAt: Date.now(),
  };

  it('returns undefined when results is undefined', () => {
    expect(getTotalPatternSameFamily(undefined)).toBeUndefined();
  });

  it('returns 0 when results is an empty object', () => {
    expect(getTotalPatternSameFamily({})).toBe(0);
  });

  it('should sum sameFamily values and return the total', () => {
    const results: Record<string, DataQualityCheckResult> = {
      a: {
        ...baseResult,
        indexName: 'a',
        markdownComments: [],
        pattern: 'pattern',
        sameFamily: 2,
      },
      b: {
        ...baseResult,
        indexName: 'b',
        markdownComments: [],
        pattern: 'pattern',
        sameFamily: 3,
      },
      c: { ...baseResult, indexName: 'c', markdownComments: [], pattern: 'pattern' },
    };

    expect(getTotalPatternSameFamily(results)).toBe(5);
  });

  it('handles a mix of defined and undefined sameFamily values', () => {
    const results: Record<string, DataQualityCheckResult> = {
      a: {
        ...baseResult,
        indexName: 'a',
        markdownComments: [],
        pattern: 'pattern',
        sameFamily: 1,
      },
      b: {
        ...baseResult,
        indexName: 'b',
        markdownComments: [],
        pattern: 'pattern',
        sameFamily: undefined,
      },
      c: {
        ...baseResult,
        indexName: 'c',
        markdownComments: [],
        pattern: 'pattern',
        sameFamily: 2,
      },
    };

    expect(getTotalPatternSameFamily(results)).toBe(3);
  });
});

describe('getTotalSameFamily', () => {
  const defaultDataQualityCheckResult: DataQualityCheckResult = {
    docsCount: 26093,
    error: null,
    ilmPhase: 'hot',
    incompatible: 0,
    indexName: '.internal.alerts-security.alerts-default-000001',
    markdownComments: ['foo', 'bar', 'baz'],
    pattern: '.alerts-security.alerts-default',
    sameFamily: 7,
    checkedAt: 1706526408000,
  };

  const alertIndexWithSameFamily: PatternRollup = {
    ...alertIndexWithAllResults,
    results: {
      '.internal.alerts-security.alerts-default-000001': {
        ...defaultDataQualityCheckResult,
      },
    },
  };

  const withSameFamily: Record<string, PatternRollup> = {
    '.internal.alerts-security.alerts-default-000001': alertIndexWithSameFamily,
  };

  test('it returns the expected count when patternRollups has sameFamily', () => {
    expect(getTotalSameFamily(withSameFamily)).toEqual(7);
  });

  test('it returns undefined when patternRollups is empty', () => {
    expect(getTotalSameFamily({})).toBeUndefined();
  });

  test('it returns zero when none of the rollups have same family', () => {
    expect(getTotalSameFamily(patternRollups)).toEqual(0);
  });
});

describe('getTotalIndices', () => {
  test('it returns the expected total when ALL `PatternRollup`s have an `indices`', () => {
    expect(getTotalIndices(patternRollups)).toEqual(5);
  });

  test('it returns undefined when only SOME of the `PatternRollup`s have an `indices`', () => {
    const someIndicesAreUndefined: Record<string, PatternRollup> = {
      'auditbeat-*': {
        ...auditbeatWithAllResults,
        indices: undefined, // <--
      },
      'packetbeat-*': mockPacketbeatPatternRollup, // indices: 2
    };

    expect(getTotalIndices(someIndicesAreUndefined)).toBeUndefined();
  });
});

describe('getTotalDocsCount', () => {
  test('it returns the expected total when ALL `PatternRollup`s have a `docsCount`', () => {
    expect(getTotalDocsCount(patternRollups)).toEqual(
      Number(auditbeatWithAllResults.docsCount) + Number(mockPacketbeatPatternRollup.docsCount)
    );
  });

  test('it returns undefined when only SOME of the `PatternRollup`s have a `docsCount`', () => {
    const someIndicesAreUndefined: Record<string, PatternRollup> = {
      'auditbeat-*': {
        ...auditbeatWithAllResults,
        docsCount: undefined, // <--
      },
      'packetbeat-*': mockPacketbeatPatternRollup,
    };

    expect(getTotalDocsCount(someIndicesAreUndefined)).toBeUndefined();
  });
});

describe('getTotalIncompatible', () => {
  test('it returns the expected total when ALL `PatternRollup`s have `results`', () => {
    expect(getTotalIncompatible(patternRollups)).toEqual(4);
  });

  test('it returns the expected total when only SOME of the `PatternRollup`s have `results`', () => {
    const someResultsAreUndefined: Record<string, PatternRollup> = {
      'auditbeat-*': auditbeatWithAllResults,
      'packetbeat-*': packetbeatNoResults, // <-- results is undefined
    };

    expect(getTotalIncompatible(someResultsAreUndefined)).toEqual(4);
  });

  test('it returns undefined when NONE of the `PatternRollup`s have `results`', () => {
    const someResultsAreUndefined: Record<string, PatternRollup> = {
      'packetbeat-*': packetbeatNoResults, // <-- results is undefined
    };

    expect(getTotalIncompatible(someResultsAreUndefined)).toBeUndefined();
  });
});

describe('getTotalIndicesChecked', () => {
  test('it returns the expected total', () => {
    expect(getTotalIndicesChecked(patternRollups)).toEqual(3);
  });

  test('it returns the expected total when errors have occurred', () => {
    const someErrors: Record<string, PatternRollup> = {
      'auditbeat-*': auditbeatWithAllResults, // indices: 3
      'packetbeat-*': packetbeatWithSomeErrors, // <-- indices: 2, but one has errors
    };

    expect(getTotalIndicesChecked(someErrors)).toEqual(4);
  });
});

describe('getIndexId', () => {
  it('returns the expected index ID', () => {
    expect(getIndexId({ indexName: 'auditbeat-custom-index-1', stats: mockStats })).toEqual(
      'uyJDDqGrRQqdBTN0mCF-iw'
    );
  });
});

describe('getIndexDocsCountFromRollup', () => {
  test('it returns the expected count when the `patternRollup` has `stats`', () => {
    expect(
      getIndexDocsCountFromRollup({
        indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
        patternRollup: mockPacketbeatPatternRollup,
      })
    ).toEqual(1628343);
  });

  test('it returns zero when the `patternRollup` `stats` is null', () => {
    const patternRollup = {
      ...mockPacketbeatPatternRollup,
      stats: null, // <--
    };

    expect(
      getIndexDocsCountFromRollup({
        indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
        patternRollup,
      })
    ).toEqual(0);
  });
});
