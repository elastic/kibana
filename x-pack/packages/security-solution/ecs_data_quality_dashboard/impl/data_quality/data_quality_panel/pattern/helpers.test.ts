/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IlmExplainLifecycleLifecycleExplain,
  IlmExplainLifecycleLifecycleExplainManaged,
  IlmExplainLifecycleLifecycleExplainUnmanaged,
} from '@elastic/elasticsearch/lib/api/types';

import {
  defaultSort,
  getIlmPhase,
  getIndexPropertiesContainerId,
  getIlmExplainPhaseCounts,
  getIndexIncompatible,
  getPageIndex,
  getPhaseCount,
  getSummaryTableItems,
  isManaged,
  shouldCreateIndexNames,
  shouldCreatePatternRollup,
} from './helpers';
import { mockIlmExplain } from '../../mock/ilm_explain/mock_ilm_explain';
import { mockDataQualityCheckResult } from '../../mock/data_quality_check_result/mock_index';
import { auditbeatWithAllResults } from '../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { mockStats } from '../../mock/stats/mock_stats';
import { IndexSummaryTableItem } from '../summary_table/helpers';
import { DataQualityCheckResult } from '../../types';
import { getIndexNames, getTotalDocsCount } from '../../helpers';

const hot: IlmExplainLifecycleLifecycleExplainManaged = {
  index: '.ds-packetbeat-8.6.1-2023.02.04-000001',
  managed: true,
  policy: 'packetbeat',
  index_creation_date_millis: 1675536751379,
  time_since_index_creation: '3.98d',
  lifecycle_date_millis: 1675536751379,
  age: '3.98d',
  phase: 'hot',
  phase_time_millis: 1675536751809,
  action: 'rollover',
  action_time_millis: 1675536751809,
  step: 'check-rollover-ready',
  step_time_millis: 1675536751809,
  phase_execution: {
    policy: 'packetbeat',
    version: 1,
    modified_date_in_millis: 1675536751205,
  },
};
const warm = {
  ...hot,
  phase: 'warm',
};
const cold = {
  ...hot,
  phase: 'cold',
};
const frozen = {
  ...hot,
  phase: 'frozen',
};
const other = {
  ...hot,
  phase: 'other', // not a valid phase
};

const managed: Record<string, IlmExplainLifecycleLifecycleExplainManaged> = {
  hot,
  warm,
  cold,
  frozen,
};

const unmanaged: IlmExplainLifecycleLifecycleExplainUnmanaged = {
  index: 'michael',
  managed: false,
};

describe('helpers', () => {
  const indexName = '.ds-packetbeat-8.6.1-2023.02.04-000001';

  describe('isManaged', () => {
    test('it returns true when the `ilmExplainRecord` `managed` property is true', () => {
      const ilmExplain = mockIlmExplain[indexName];

      expect(isManaged(ilmExplain)).toBe(true);
    });

    test('it returns false when the `ilmExplainRecord` is undefined', () => {
      expect(isManaged(undefined)).toBe(false);
    });
  });

  describe('getPhaseCount', () => {
    test('it returns the expected count when an index with the specified `ilmPhase` exists in the `IlmExplainLifecycleLifecycleExplain` record', () => {
      expect(
        getPhaseCount({
          ilmExplain: mockIlmExplain,
          ilmPhase: 'hot', // this phase is in the record
          indexName, // valid index name
        })
      ).toEqual(1);
    });

    test('it returns zero when `ilmPhase` is null', () => {
      expect(
        getPhaseCount({
          ilmExplain: null,
          ilmPhase: 'hot',
          indexName,
        })
      ).toEqual(0);
    });

    test('it returns zero when the `indexName` does NOT exist in the `IlmExplainLifecycleLifecycleExplain` record', () => {
      expect(
        getPhaseCount({
          ilmExplain: mockIlmExplain,
          ilmPhase: 'hot',
          indexName: 'invalid', // this index does NOT exist
        })
      ).toEqual(0);
    });

    test('it returns zero when the specified `ilmPhase` does NOT exist in the `IlmExplainLifecycleLifecycleExplain` record', () => {
      expect(
        getPhaseCount({
          ilmExplain: mockIlmExplain,
          ilmPhase: 'warm', // this phase is NOT in the record
          indexName, // valid index name
        })
      ).toEqual(0);
    });

    describe('when `ilmPhase` is `unmanaged`', () => {
      test('it returns the expected count for an `unmanaged` index', () => {
        const index = 'auditbeat-custom-index-1';
        const ilmExplainRecord: IlmExplainLifecycleLifecycleExplain = {
          index,
          managed: false,
        };
        const ilmExplain = {
          [index]: ilmExplainRecord,
        };

        expect(
          getPhaseCount({
            ilmExplain,
            ilmPhase: 'unmanaged', // ilmPhase is unmanaged
            indexName: index, // an unmanaged index
          })
        ).toEqual(1);
      });

      test('it returns zero for a managed index', () => {
        expect(
          getPhaseCount({
            ilmExplain: mockIlmExplain,
            ilmPhase: 'unmanaged', // ilmPhase is unmanaged
            indexName, // a managed (`hot`) index
          })
        ).toEqual(0);
      });
    });
  });

  describe('getIlmPhase', () => {
    const isILMAvailable = true;
    test('it returns undefined when the `ilmExplainRecord` is undefined', () => {
      expect(getIlmPhase(undefined, isILMAvailable)).toBeUndefined();
    });

    describe('when the `ilmExplainRecord` is a `IlmExplainLifecycleLifecycleExplainManaged` record', () => {
      Object.keys(managed).forEach((phase) =>
        test(`it returns the expected phase when 'phase' is '${phase}'`, () => {
          expect(getIlmPhase(managed[phase], isILMAvailable)).toEqual(phase);
        })
      );

      test(`it returns undefined when the 'phase' is unknown`, () => {
        expect(getIlmPhase(other, isILMAvailable)).toBeUndefined();
      });
    });

    describe('when the `ilmExplainRecord` is a `IlmExplainLifecycleLifecycleExplainUnmanaged` record', () => {
      test('it returns `unmanaged`', () => {
        expect(getIlmPhase(unmanaged, isILMAvailable)).toEqual('unmanaged');
      });
    });
  });

  describe('getIlmExplainPhaseCounts', () => {
    test('it returns the expected counts (all zeros) when `ilmExplain` is null', () => {
      expect(getIlmExplainPhaseCounts(null)).toEqual({
        cold: 0,
        frozen: 0,
        hot: 0,
        unmanaged: 0,
        warm: 0,
      });
    });

    test('it returns the expected counts', () => {
      const ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> = {
        ...managed,
        [unmanaged.index]: unmanaged,
      };

      expect(getIlmExplainPhaseCounts(ilmExplain)).toEqual({
        cold: 1,
        frozen: 1,
        hot: 1,
        unmanaged: 1,
        warm: 1,
      });
    });
  });

  describe('getIndexIncompatible', () => {
    test('it returns undefined when `results` is undefined', () => {
      expect(
        getIndexIncompatible({
          indexName,
          results: undefined, // <--
        })
      ).toBeUndefined();
    });

    test('it returns undefined when `indexName` is not in the `results`', () => {
      expect(
        getIndexIncompatible({
          indexName: 'not_in_the_results', // <--
          results: mockDataQualityCheckResult,
        })
      ).toBeUndefined();
    });

    test('it returns the expected count', () => {
      expect(
        getIndexIncompatible({
          indexName: 'auditbeat-custom-index-1',
          results: mockDataQualityCheckResult,
        })
      ).toEqual(3);
    });
  });

  describe('getSummaryTableItems', () => {
    const indexNames = [
      '.ds-packetbeat-8.6.1-2023.02.04-000001',
      '.ds-packetbeat-8.5.3-2023.02.04-000001',
      'auditbeat-custom-index-1',
    ];
    const pattern = 'auditbeat-*';
    const patternDocsCount = 4;
    const results: Record<string, DataQualityCheckResult> = {
      'auditbeat-custom-index-1': {
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
        checkedAt: 1706526408000,
      },
    };
    const isILMAvailable = true;

    test('it returns the expected summary table items', () => {
      expect(
        getSummaryTableItems({
          ilmExplain: mockIlmExplain,
          indexNames,
          isILMAvailable,
          pattern,
          patternDocsCount,
          results,
          sortByColumn: defaultSort.sort.field,
          sortByDirection: defaultSort.sort.direction,
          stats: mockStats,
        })
      ).toEqual([
        {
          docsCount: 1630289,
          ilmPhase: 'hot',
          incompatible: undefined,
          indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
          pattern: 'auditbeat-*',
          patternDocsCount: 4,
          sizeInBytes: 733175040,
          checkedAt: undefined,
        },
        {
          docsCount: 1628343,
          ilmPhase: 'hot',
          incompatible: undefined,
          indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
          pattern: 'auditbeat-*',
          patternDocsCount: 4,
          sizeInBytes: 731583142,
          checkedAt: undefined,
        },
        {
          docsCount: 4,
          ilmPhase: 'unmanaged',
          incompatible: 3,
          indexName: 'auditbeat-custom-index-1',
          pattern: 'auditbeat-*',
          patternDocsCount: 4,
          sizeInBytes: 28413,
          checkedAt: 1706526408000,
        },
      ]);
    });

    test('it returns the expected summary table items when isILMAvailable is false', () => {
      expect(
        getSummaryTableItems({
          ilmExplain: mockIlmExplain,
          indexNames,
          isILMAvailable: false,
          pattern,
          patternDocsCount,
          results,
          sortByColumn: defaultSort.sort.field,
          sortByDirection: defaultSort.sort.direction,
          stats: mockStats,
        })
      ).toEqual([
        {
          docsCount: 1630289,
          ilmPhase: undefined,
          incompatible: undefined,
          indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
          pattern: 'auditbeat-*',
          patternDocsCount: 4,
          sizeInBytes: 733175040,
          checkedAt: undefined,
        },
        {
          docsCount: 1628343,
          ilmPhase: undefined,
          incompatible: undefined,
          indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
          pattern: 'auditbeat-*',
          patternDocsCount: 4,
          sizeInBytes: 731583142,
          checkedAt: undefined,
        },
        {
          docsCount: 4,
          ilmPhase: undefined,
          incompatible: 3,
          indexName: 'auditbeat-custom-index-1',
          pattern: 'auditbeat-*',
          patternDocsCount: 4,
          sizeInBytes: 28413,
          checkedAt: 1706526408000,
        },
      ]);
    });

    test('it returns the expected summary table items when `sortByDirection` is ascending', () => {
      expect(
        getSummaryTableItems({
          ilmExplain: mockIlmExplain,
          indexNames,
          isILMAvailable,
          pattern,
          patternDocsCount,
          results,
          sortByColumn: defaultSort.sort.field,
          sortByDirection: 'asc', // <-- ascending
          stats: mockStats,
        })
      ).toEqual([
        {
          docsCount: 4,
          ilmPhase: 'unmanaged',
          incompatible: 3,
          indexName: 'auditbeat-custom-index-1',
          pattern: 'auditbeat-*',
          patternDocsCount: 4,
          sizeInBytes: 28413,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 1628343,
          ilmPhase: 'hot',
          incompatible: undefined,
          indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
          pattern: 'auditbeat-*',
          patternDocsCount: 4,
          sizeInBytes: 731583142,
          checkedAt: undefined,
        },
        {
          docsCount: 1630289,
          ilmPhase: 'hot',
          incompatible: undefined,
          indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
          pattern: 'auditbeat-*',
          patternDocsCount: 4,
          sizeInBytes: 733175040,
          checkedAt: undefined,
        },
      ]);
    });

    test('it returns the expected summary table items when data is unavailable', () => {
      expect(
        getSummaryTableItems({
          ilmExplain: null, // <-- no data
          indexNames,
          isILMAvailable,
          pattern,
          patternDocsCount,
          results: undefined, // <-- no data
          sortByColumn: defaultSort.sort.field,
          sortByDirection: defaultSort.sort.direction,
          stats: null, // <-- no data
        })
      ).toEqual([
        {
          docsCount: 0,
          ilmPhase: undefined,
          incompatible: undefined,
          indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
          pattern: 'auditbeat-*',
          patternDocsCount: 4,
          sizeInBytes: undefined,
          checkedAt: undefined,
        },
        {
          docsCount: 0,
          ilmPhase: undefined,
          incompatible: undefined,
          indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
          pattern: 'auditbeat-*',
          patternDocsCount: 4,
          sizeInBytes: undefined,
          checkedAt: undefined,
        },
        {
          docsCount: 0,
          ilmPhase: undefined,
          incompatible: undefined,
          indexName: 'auditbeat-custom-index-1',
          pattern: 'auditbeat-*',
          patternDocsCount: 4,
          sizeInBytes: undefined,
          checkedAt: undefined,
        },
      ]);
    });
  });

  describe('shouldCreateIndexNames', () => {
    const indexNames = [
      '.ds-packetbeat-8.6.1-2023.02.04-000001',
      '.ds-packetbeat-8.5.3-2023.02.04-000001',
      'auditbeat-custom-index-1',
    ];
    const isILMAvailable = true;

    test('returns true when `indexNames` does NOT exist, and the required `stats` and `ilmExplain` are available', () => {
      expect(
        shouldCreateIndexNames({
          ilmExplain: mockIlmExplain,
          indexNames: undefined,
          isILMAvailable,
          newIndexNames: [],
          stats: mockStats,
        })
      ).toBe(true);
    });

    test('returns true when `isILMAvailable` is false, and the required `stats` is available,  and `ilmExplain` is not available', () => {
      expect(
        shouldCreateIndexNames({
          ilmExplain: null,
          indexNames: undefined,
          isILMAvailable: false,
          newIndexNames: [],
          stats: mockStats,
        })
      ).toBe(true);
    });

    test('returns false when `indexNames` exists, and the required `stats` and `ilmExplain` are available', () => {
      expect(
        shouldCreateIndexNames({
          ilmExplain: mockIlmExplain,
          indexNames,
          isILMAvailable,
          newIndexNames: indexNames,
          stats: mockStats,
        })
      ).toBe(false);
    });

    test('returns false when `indexNames` does NOT exist, `stats` is NOT available, and `ilmExplain` is available', () => {
      expect(
        shouldCreateIndexNames({
          ilmExplain: mockIlmExplain,
          indexNames: undefined,
          isILMAvailable,
          newIndexNames: [],
          stats: null,
        })
      ).toBe(false);
    });

    test('returns false when `indexNames` does NOT exist, `stats` is available, and `ilmExplain` is NOT available', () => {
      expect(
        shouldCreateIndexNames({
          ilmExplain: null,
          indexNames: undefined,
          isILMAvailable,
          newIndexNames: [],
          stats: mockStats,
        })
      ).toBe(false);
    });

    test('returns false when `indexNames` does NOT exist, `stats` is NOT available, and `ilmExplain` is NOT available', () => {
      expect(
        shouldCreateIndexNames({
          ilmExplain: null,
          indexNames: undefined,
          isILMAvailable,
          newIndexNames: [],
          stats: null,
        })
      ).toBe(false);
    });

    test('returns false when `indexNames` exists, `stats` is NOT available, and `ilmExplain` is NOT available', () => {
      expect(
        shouldCreateIndexNames({
          ilmExplain: null,
          indexNames,
          isILMAvailable,
          newIndexNames: [],
          stats: null,
        })
      ).toBe(false);
    });
  });

  describe('shouldCreatePatternRollup', () => {
    const isILMAvailable = true;
    const newIndexNames = getIndexNames({
      stats: mockStats,
      ilmExplain: mockIlmExplain,
      ilmPhases: ['hot', 'unmanaged'],
      isILMAvailable,
    });
    const newDocsCount = getTotalDocsCount({ indexNames: newIndexNames, stats: mockStats });
    test('it returns false when the `patternRollup.docsCount` equals newDocsCount', () => {
      expect(
        shouldCreatePatternRollup({
          error: null,
          ilmExplain: mockIlmExplain,
          isILMAvailable,
          newDocsCount: auditbeatWithAllResults.docsCount as number,
          patternRollup: auditbeatWithAllResults,
          stats: mockStats,
        })
      ).toBe(false);
    });

    test('it returns true when all data and ILMExplain were loaded', () => {
      expect(
        shouldCreatePatternRollup({
          error: null,
          ilmExplain: mockIlmExplain,
          isILMAvailable,
          newDocsCount,
          patternRollup: undefined,
          stats: mockStats,
        })
      ).toBe(true);
    });

    test('it returns true when all data was loaded and ILM is not available', () => {
      expect(
        shouldCreatePatternRollup({
          error: null,
          ilmExplain: null,
          isILMAvailable: false,
          newDocsCount,
          patternRollup: undefined,
          stats: mockStats,
        })
      ).toBe(true);
    });

    test('it returns false when `stats`, but NOT `ilmExplain` was loaded', () => {
      expect(
        shouldCreatePatternRollup({
          error: null,
          ilmExplain: null,
          isILMAvailable,
          newDocsCount,
          patternRollup: undefined,
          stats: mockStats,
        })
      ).toBe(false);
    });

    test('it returns false when `stats` was NOT loaded, and `ilmExplain` was loaded', () => {
      expect(
        shouldCreatePatternRollup({
          error: null,
          ilmExplain: mockIlmExplain,
          isILMAvailable,
          newDocsCount,
          patternRollup: undefined,
          stats: null,
        })
      ).toBe(false);
    });

    test('it returns true if an error occurred, and NO data was loaded', () => {
      expect(
        shouldCreatePatternRollup({
          error: 'whoops',
          ilmExplain: null,
          isILMAvailable,
          newDocsCount,
          patternRollup: undefined,
          stats: null,
        })
      ).toBe(true);
    });

    test('it returns true if an error occurred, and just `stats` was loaded', () => {
      expect(
        shouldCreatePatternRollup({
          error: 'something went',
          ilmExplain: null,
          isILMAvailable,
          newDocsCount,
          patternRollup: undefined,
          stats: mockStats,
        })
      ).toBe(true);
    });

    test('it returns true if an error occurred, and just `ilmExplain` was loaded', () => {
      expect(
        shouldCreatePatternRollup({
          error: 'horribly wrong',
          ilmExplain: mockIlmExplain,
          isILMAvailable,
          newDocsCount,
          patternRollup: undefined,
          stats: null,
        })
      ).toBe(true);
    });

    test('it returns true if an error occurred, and all data was loaded', () => {
      expect(
        shouldCreatePatternRollup({
          error: 'over here',
          ilmExplain: mockIlmExplain,
          isILMAvailable,
          newDocsCount,
          patternRollup: undefined,
          stats: mockStats,
        })
      ).toBe(true);
    });
  });

  describe('getIndexPropertiesContainerId', () => {
    const pattern = 'auditbeat-*';

    test('it returns the expected id', () => {
      expect(getIndexPropertiesContainerId({ indexName, pattern })).toEqual(
        'index-properties-container-auditbeat-*.ds-packetbeat-8.6.1-2023.02.04-000001'
      );
    });
  });

  describe('getPageIndex', () => {
    const getPageIndexArgs: {
      indexName: string;
      items: IndexSummaryTableItem[];
      pageSize: number;
    } = {
      indexName: 'auditbeat-7.17.9-2023.04.09-000001', // <-- on page 2 of 3 (page index 1)
      items: [
        {
          docsCount: 48077,
          incompatible: undefined,
          indexName: 'auditbeat-7.14.2-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 43357342,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 48068,
          incompatible: undefined,
          indexName: 'auditbeat-7.3.2-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 32460397,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 48064,
          incompatible: undefined,
          indexName: 'auditbeat-7.11.2-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 42782794,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47868,
          incompatible: undefined,
          indexName: 'auditbeat-7.6.2-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 31575964,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47827,
          incompatible: 20,
          indexName: 'auditbeat-7.15.2-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 44130657,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47642,
          incompatible: undefined,
          indexName: '.ds-auditbeat-8.4.3-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 42412521,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47545,
          incompatible: undefined,
          indexName: 'auditbeat-7.16.3-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 41423244,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47531,
          incompatible: undefined,
          indexName: 'auditbeat-7.5.2-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 32394133,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47530,
          incompatible: undefined,
          indexName: 'auditbeat-7.12.1-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 43015519,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47520,
          incompatible: undefined,
          indexName: '.ds-auditbeat-8.0.1-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 42230604,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47496,
          incompatible: undefined,
          indexName: '.ds-auditbeat-8.2.3-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 41710968,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47486,
          incompatible: undefined,
          indexName: '.ds-auditbeat-8.5.3-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 42295944,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47486,
          incompatible: undefined,
          indexName: '.ds-auditbeat-8.3.3-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 41761321,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47460,
          incompatible: undefined,
          indexName: 'auditbeat-7.2.1-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 30481198,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47439,
          incompatible: undefined,
          indexName: 'auditbeat-7.17.9-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 41554041,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47395,
          incompatible: undefined,
          indexName: 'auditbeat-7.9.3-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 42815907,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47394,
          incompatible: undefined,
          indexName: '.ds-auditbeat-8.7.0-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 41157112,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47372,
          incompatible: undefined,
          indexName: 'auditbeat-7.4.2-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 31626792,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47369,
          incompatible: undefined,
          indexName: 'auditbeat-7.13.4-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 41828969,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47348,
          incompatible: undefined,
          indexName: 'auditbeat-7.7.1-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 40010773,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47339,
          incompatible: undefined,
          indexName: 'auditbeat-7.10.2-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 43480570,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47325,
          incompatible: undefined,
          indexName: '.ds-auditbeat-8.1.3-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 41822475,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 47294,
          incompatible: undefined,
          indexName: 'auditbeat-7.8.0-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 43018490,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 24276,
          incompatible: undefined,
          indexName: '.ds-auditbeat-8.6.1-2023.04.09-000001',
          ilmPhase: 'hot',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 23579440,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 4,
          incompatible: undefined,
          indexName: 'auditbeat-custom-index-1',
          ilmPhase: 'unmanaged',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 28409,
          checkedAt: 1706526408000,
        },
        {
          docsCount: 0,
          incompatible: undefined,
          indexName: 'auditbeat-custom-empty-index-1',
          ilmPhase: 'unmanaged',
          pattern: 'auditbeat-*',
          patternDocsCount: 1118155,
          sizeInBytes: 247,
          checkedAt: 1706526408000,
        },
      ],
      pageSize: 10,
    };

    test('it returns the expected page index', () => {
      expect(getPageIndex(getPageIndexArgs)).toEqual(1);
    });

    test('it returns the expected page index for the first item', () => {
      const firstItemIndexName = 'auditbeat-7.14.2-2023.04.09-000001';

      expect(
        getPageIndex({
          ...getPageIndexArgs,
          indexName: firstItemIndexName,
        })
      ).toEqual(0);
    });

    test('it returns the expected page index for the last item', () => {
      const lastItemIndexName = 'auditbeat-custom-empty-index-1';

      expect(
        getPageIndex({
          ...getPageIndexArgs,
          indexName: lastItemIndexName,
        })
      ).toEqual(2);
    });

    test('it returns null when the index cannot be found', () => {
      expect(
        getPageIndex({
          ...getPageIndexArgs,
          indexName: 'does_not_exist', // <-- this index is not in the items
        })
      ).toBeNull();
    });

    test('it returns null when `pageSize` is zero', () => {
      expect(
        getPageIndex({
          ...getPageIndexArgs,
          pageSize: 0, // <-- invalid
        })
      ).toBeNull();
    });
  });
});
