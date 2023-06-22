/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';

import {
  ECS_MAPPING_TYPE_EXPECTED,
  FIELD,
  INDEX_MAPPING_TYPE_ACTUAL,
} from '../../../compare_fields_table/translations';
import { ERRORS } from '../../data_quality_summary/errors_popover/translations';
import { ERROR, INDEX, PATTERN } from '../../data_quality_summary/errors_viewer/translations';
import {
  escape,
  escapePreserveNewlines,
  getAllowedValues,
  getCodeFormattedValue,
  getCustomMarkdownTableRows,
  getDataQualitySummaryMarkdownComment,
  getErrorsMarkdownTable,
  getErrorsMarkdownTableRows,
  getHeaderSeparator,
  getIlmExplainPhaseCountsMarkdownComment,
  getIncompatibleMappingsMarkdownTableRows,
  getIncompatibleValuesMarkdownTableRows,
  getIndexInvalidValues,
  getMarkdownComment,
  getMarkdownTable,
  getMarkdownTableHeader,
  getPatternSummaryMarkdownComment,
  getResultEmoji,
  getSameFamilyBadge,
  getStatsRollupMarkdownComment,
  getSummaryMarkdownComment,
  getSummaryTableMarkdownComment,
  getSummaryTableMarkdownHeader,
  getSummaryTableMarkdownRow,
  getTabCountsMarkdownComment,
} from './helpers';
import { EMPTY_STAT } from '../../../helpers';
import { mockAllowedValues } from '../../../mock/allowed_values/mock_allowed_values';
import {
  eventCategory,
  mockCustomFields,
  mockIncompatibleMappings,
  sourceIpWithTextMapping,
} from '../../../mock/enriched_field_metadata/mock_enriched_field_metadata';
import { mockPartitionedFieldMetadata } from '../../../mock/partitioned_field_metadata/mock_partitioned_field_metadata';
import {
  auditbeatNoResults,
  auditbeatWithAllResults,
} from '../../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { SAME_FAMILY } from '../../same_family/translations';
import { INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE } from '../../tabs/incompatible_tab/translations';
import {
  EnrichedFieldMetadata,
  ErrorSummary,
  PatternRollup,
  UnallowedValueCount,
} from '../../../types';

const errorSummary: ErrorSummary[] = [
  {
    pattern: '.alerts-security.alerts-default',
    indexName: null,
    error: 'Error loading stats: Error: Forbidden',
  },
  {
    error:
      'Error: Error loading unallowed values for index auditbeat-7.2.1-2023.02.13-000001: Forbidden',
    indexName: 'auditbeat-7.2.1-2023.02.13-000001',
    pattern: 'auditbeat-*',
  },
];

const indexName = 'auditbeat-custom-index-1';

const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const defaultNumberFormat = '0,0.[000]';
const formatNumber = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

describe('helpers', () => {
  describe('escape', () => {
    test('it returns undefined when `content` is undefined', () => {
      expect(escape(undefined)).toBeUndefined();
    });

    test("it returns the content unmodified when there's nothing to escape", () => {
      const content = "there's nothing to escape in this content";
      expect(escape(content)).toEqual(content);
    });

    test('it replaces all newlines in the content with spaces', () => {
      const content = '\nthere were newlines in the beginning, middle,\nand end\n';
      expect(escape(content)).toEqual(' there were newlines in the beginning, middle, and end ');
    });

    test('it escapes all column separators in the content with spaces', () => {
      const content = '|there were column separators in the beginning, middle,|and end|';
      expect(escape(content)).toEqual(
        '\\|there were column separators in the beginning, middle,\\|and end\\|'
      );
    });

    test('it escapes content containing BOTH newlines and column separators', () => {
      const content =
        '|\nthere were newlines and column separators in the beginning, middle,\n|and end|\n';
      expect(escape(content)).toEqual(
        '\\| there were newlines and column separators in the beginning, middle, \\|and end\\| '
      );
    });
  });

  describe('escapePreserveNewlines', () => {
    test('it returns undefined when `content` is undefined', () => {
      expect(escapePreserveNewlines(undefined)).toBeUndefined();
    });

    test("it returns the content unmodified when there's nothing to escape", () => {
      const content = "there's (also) nothing to escape in this content";
      expect(escapePreserveNewlines(content)).toEqual(content);
    });

    test('it escapes all column separators in the content with spaces', () => {
      const content = '|there were column separators in the beginning, middle,|and end|';
      expect(escapePreserveNewlines(content)).toEqual(
        '\\|there were column separators in the beginning, middle,\\|and end\\|'
      );
    });

    test('it does NOT escape newlines in the content', () => {
      const content =
        '|\nthere were newlines and column separators in the beginning, middle,\n|and end|\n';
      expect(escapePreserveNewlines(content)).toEqual(
        '\\|\nthere were newlines and column separators in the beginning, middle,\n\\|and end\\|\n'
      );
    });
  });

  describe('getHeaderSeparator', () => {
    test('it returns a sequence of dashes equal to the length of the header, plus two additional dashes to pad each end of the cntent', () => {
      const content = '0123456789'; // content.length === 10
      const expected = '------------'; // expected.length === 12

      expect(getHeaderSeparator(content)).toEqual(expected);
    });
  });

  describe('getMarkdownTableHeader', () => {
    const headerNames = [
      '|\nthere were newlines and column separators in the beginning, middle,\n|and end|\n',
      'A second column',
      'A third column',
    ];

    test('it returns the expected table header', () => {
      expect(getMarkdownTableHeader(headerNames)).toEqual(
        '\n| \\| there were newlines and column separators in the beginning, middle, \\|and end\\|  | A second column | A third column | \n|----------------------------------------------------------------------------------|-----------------|----------------|'
      );
    });
  });

  describe('getCodeFormattedValue', () => {
    test('it returns the expected placeholder when `value` is undefined', () => {
      expect(getCodeFormattedValue(undefined)).toEqual('`--`');
    });

    test('it returns the content formatted as markdown code', () => {
      const value = 'foozle';

      expect(getCodeFormattedValue(value)).toEqual('`foozle`');
    });

    test('it escapes content such that `value` may be included in a markdown table cell', () => {
      const value =
        '|\nthere were newlines and column separators in the beginning, middle,\n|and end|\n';

      expect(getCodeFormattedValue(value)).toEqual(
        '`\\| there were newlines and column separators in the beginning, middle, \\|and end\\| `'
      );
    });
  });

  describe('getAllowedValues', () => {
    test('it returns the expected placeholder when `allowedValues` is undefined', () => {
      expect(getAllowedValues(undefined)).toEqual('`--`');
    });

    test('it joins the `allowedValues` `name`s as a markdown-code-formatted, comma separated, string', () => {
      expect(getAllowedValues(mockAllowedValues)).toEqual(
        '`authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web`'
      );
    });
  });

  describe('getIndexInvalidValues', () => {
    test('it returns the expected placeholder when `indexInvalidValues` is empty', () => {
      expect(getIndexInvalidValues([])).toEqual('`--`');
    });

    test('it returns markdown-code-formatted `fieldName`s, and their associated `count`s', () => {
      const indexInvalidValues: UnallowedValueCount[] = [
        {
          count: 2,
          fieldName: 'an_invalid_category',
        },
        {
          count: 1,
          fieldName: 'theory',
        },
      ];

      expect(getIndexInvalidValues(indexInvalidValues)).toEqual(
        `\`an_invalid_category\` (2), \`theory\` (1)`
      );
    });
  });

  describe('getCustomMarkdownTableRows', () => {
    test('it returns the expected table rows', () => {
      expect(getCustomMarkdownTableRows(mockCustomFields)).toEqual(
        '| host.name.keyword | `keyword` | `--` |\n| some.field | `text` | `--` |\n| some.field.keyword | `keyword` | `--` |\n| source.ip.keyword | `keyword` | `--` |'
      );
    });

    test('it returns the expected table rows when some have allowed values', () => {
      const withAllowedValues = [
        ...mockCustomFields,
        eventCategory, // note: this is not a real-world use case, because custom fields don't have allowed values
      ];

      expect(getCustomMarkdownTableRows(withAllowedValues)).toEqual(
        '| host.name.keyword | `keyword` | `--` |\n| some.field | `text` | `--` |\n| some.field.keyword | `keyword` | `--` |\n| source.ip.keyword | `keyword` | `--` |\n| event.category | `keyword` | `authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web` |'
      );
    });
  });

  describe('getSameFamilyBadge', () => {
    test('it returns the expected badge text when the field is in the same family', () => {
      const inSameFamily = {
        ...eventCategory,
        isInSameFamily: true,
      };

      expect(getSameFamilyBadge(inSameFamily)).toEqual(`\`${SAME_FAMILY}\``);
    });

    test('it returns an empty string when the field is NOT the same family', () => {
      const notInSameFamily = {
        ...eventCategory,
        isInSameFamily: false,
      };

      expect(getSameFamilyBadge(notInSameFamily)).toEqual('');
    });
  });

  describe('getIncompatibleMappingsMarkdownTableRows', () => {
    test('it returns the expected table rows when the field is in the same family', () => {
      const eventCategoryWithWildcard: EnrichedFieldMetadata = {
        ...eventCategory, // `event.category` is a `keyword` per the ECS spec
        indexFieldType: 'wildcard', // this index has a mapping of `wildcard` instead of `keyword`
        isInSameFamily: true, // `wildcard` and `keyword` are in the same family
      };

      expect(
        getIncompatibleMappingsMarkdownTableRows([
          eventCategoryWithWildcard,
          sourceIpWithTextMapping,
        ])
      ).toEqual(
        '| event.category | `keyword` | `wildcard` `same family` |\n| source.ip | `ip` | `text`  |'
      );
    });

    test('it returns the expected table rows when the field is NOT in the same family', () => {
      const eventCategoryWithText: EnrichedFieldMetadata = {
        ...eventCategory, // `event.category` is a `keyword` per the ECS spec
        indexFieldType: 'text', // this index has a mapping of `text` instead of `keyword`
        isInSameFamily: false, // `text` and `keyword` are NOT in the same family
      };

      expect(
        getIncompatibleMappingsMarkdownTableRows([eventCategoryWithText, sourceIpWithTextMapping])
      ).toEqual('| event.category | `keyword` | `text`  |\n| source.ip | `ip` | `text`  |');
    });
  });

  describe('getIncompatibleValuesMarkdownTableRows', () => {
    test('it returns the expected table rows', () => {
      expect(
        getIncompatibleValuesMarkdownTableRows([
          {
            ...eventCategory,
            hasEcsMetadata: true,
            indexInvalidValues: [
              {
                count: 2,
                fieldName: 'an_invalid_category',
              },
              {
                count: 1,
                fieldName: 'theory',
              },
            ],
            isEcsCompliant: false,
          },
        ])
      ).toEqual(
        '| event.category | `authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web` | `an_invalid_category` (2), `theory` (1) |'
      );
    });
  });

  describe('getMarkdownComment', () => {
    test('it returns the expected markdown comment', () => {
      const suggestedAction =
        '|\nthere were newlines and column separators in this suggestedAction beginning, middle,\n|and end|\n';
      const title =
        '|\nthere were newlines and column separators in this title beginning, middle,\n|and end|\n';

      expect(getMarkdownComment({ suggestedAction, title })).toEqual(
        '#### \\| there were newlines and column separators in this title beginning, middle, \\|and end\\| \n\n\\|\nthere were newlines and column separators in this suggestedAction beginning, middle,\n\\|and end\\|\n'
      );
    });
  });

  describe('getErrorsMarkdownTableRows', () => {
    test('it returns the expected markdown table rows', () => {
      expect(getErrorsMarkdownTableRows(errorSummary)).toEqual(
        '| .alerts-security.alerts-default | -- | `Error loading stats: Error: Forbidden` |\n| auditbeat-* | auditbeat-7.2.1-2023.02.13-000001 | `Error: Error loading unallowed values for index auditbeat-7.2.1-2023.02.13-000001: Forbidden` |'
      );
    });
  });

  describe('getErrorsMarkdownTable', () => {
    test('it returns the expected table contents', () => {
      expect(
        getErrorsMarkdownTable({
          errorSummary,
          getMarkdownTableRows: getErrorsMarkdownTableRows,
          headerNames: [PATTERN, INDEX, ERROR],
          title: ERRORS,
        })
      ).toEqual(
        `## Errors\n\nSome indices were not checked for Data Quality\n\nErrors may occur when pattern or index metadata is temporarily unavailable, or because you don't have the privileges required for access\n\nThe following privileges are required to check an index:\n- \`monitor\` or \`manage\`\n- \`view_index_metadata\`\n- \`read\`\n\n\n| Pattern | Index | Error | \n|---------|-------|-------|\n| .alerts-security.alerts-default | -- | \`Error loading stats: Error: Forbidden\` |\n| auditbeat-* | auditbeat-7.2.1-2023.02.13-000001 | \`Error: Error loading unallowed values for index auditbeat-7.2.1-2023.02.13-000001: Forbidden\` |\n`
      );
    });

    test('it returns an empty string when the error summary is empty', () => {
      expect(
        getErrorsMarkdownTable({
          errorSummary: [], // <-- empty
          getMarkdownTableRows: getErrorsMarkdownTableRows,
          headerNames: [PATTERN, INDEX, ERROR],
          title: ERRORS,
        })
      ).toEqual('');
    });
  });

  describe('getMarkdownTable', () => {
    test('it returns the expected table contents', () => {
      expect(
        getMarkdownTable({
          enrichedFieldMetadata: mockIncompatibleMappings,
          getMarkdownTableRows: getIncompatibleMappingsMarkdownTableRows,
          headerNames: [FIELD, ECS_MAPPING_TYPE_EXPECTED, INDEX_MAPPING_TYPE_ACTUAL],
          title: INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE(indexName),
        })
      ).toEqual(
        '#### Incompatible field mappings - auditbeat-custom-index-1\n\n\n| Field | ECS mapping type (expected) | Index mapping type (actual) | \n|-------|-----------------------------|-----------------------------|\n| host.name | `keyword` | `text`  |\n| source.ip | `ip` | `text`  |\n'
      );
    });

    test('it returns an empty string when `enrichedFieldMetadata` is empty', () => {
      expect(
        getMarkdownTable({
          enrichedFieldMetadata: [], // <-- empty
          getMarkdownTableRows: getIncompatibleMappingsMarkdownTableRows,
          headerNames: [FIELD, ECS_MAPPING_TYPE_EXPECTED, INDEX_MAPPING_TYPE_ACTUAL],
          title: INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE(indexName),
        })
      ).toEqual('');
    });
  });

  describe('getSummaryMarkdownComment', () => {
    test('it returns the expected markdown comment', () => {
      expect(getSummaryMarkdownComment(indexName)).toEqual('### auditbeat-custom-index-1\n');
    });
  });

  describe('getTabCountsMarkdownComment', () => {
    test('it returns a comment with the expected counts', () => {
      expect(getTabCountsMarkdownComment(mockPartitionedFieldMetadata)).toBe(
        '### **Incompatible fields** `3` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n'
      );
    });
  });

  describe('getResultEmoji', () => {
    test('it returns the expected placeholder when `incompatible` is undefined', () => {
      expect(getResultEmoji(undefined)).toEqual('--');
    });

    test('it returns a ✅ when the incompatible count is zero', () => {
      expect(getResultEmoji(0)).toEqual('✅');
    });

    test('it returns a ❌ when the incompatible count is NOT zero', () => {
      expect(getResultEmoji(1)).toEqual('❌');
    });
  });

  describe('getSummaryTableMarkdownHeader', () => {
    test('it returns the expected header', () => {
      expect(getSummaryTableMarkdownHeader()).toEqual(
        '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|'
      );
    });
  });

  describe('getSummaryTableMarkdownRow', () => {
    test('it returns the expected row when all values are provided', () => {
      expect(
        getSummaryTableMarkdownRow({
          docsCount: 4,
          formatBytes,
          formatNumber,
          incompatible: 3,
          ilmPhase: 'unmanaged',
          indexName: 'auditbeat-custom-index-1',
          patternDocsCount: 57410,
          sizeInBytes: 28413,
        })
      ).toEqual('| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 | `unmanaged` | 27.7KB |\n');
    });

    test('it returns the expected row when optional values are NOT provided', () => {
      expect(
        getSummaryTableMarkdownRow({
          docsCount: 4,
          formatBytes,
          formatNumber,
          incompatible: undefined, // <--
          ilmPhase: undefined, // <--
          indexName: 'auditbeat-custom-index-1',
          patternDocsCount: 57410,
          sizeInBytes: 28413,
        })
      ).toEqual('| -- | auditbeat-custom-index-1 | 4 (0.0%) | -- | -- | 27.7KB |\n');
    });
  });

  describe('getSummaryTableMarkdownComment', () => {
    test('it returns the expected comment', () => {
      expect(
        getSummaryTableMarkdownComment({
          docsCount: 4,
          formatBytes,
          formatNumber,
          ilmPhase: 'unmanaged',
          indexName: 'auditbeat-custom-index-1',
          partitionedFieldMetadata: mockPartitionedFieldMetadata,
          patternDocsCount: 57410,
          sizeInBytes: 28413,
        })
      ).toEqual(
        '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 | `unmanaged` | 27.7KB |\n\n'
      );
    });
  });

  describe('getStatsRollupMarkdownComment', () => {
    test('it returns the expected comment', () => {
      expect(
        getStatsRollupMarkdownComment({
          docsCount: 57410,
          formatBytes,
          formatNumber,
          incompatible: 3,
          indices: 25,
          indicesChecked: 1,
          sizeInBytes: 28413,
        })
      ).toEqual(
        '| Incompatible fields | Indices checked | Indices | Size | Docs |\n|---------------------|-----------------|---------|------|------|\n| 3 | 1 | 25 | 27.7KB | 57,410 |\n'
      );
    });

    test('it returns the expected comment when optional values are undefined', () => {
      expect(
        getStatsRollupMarkdownComment({
          docsCount: 0,
          formatBytes,
          formatNumber,
          incompatible: undefined,
          indices: undefined,
          indicesChecked: undefined,
          sizeInBytes: undefined,
        })
      ).toEqual(
        '| Incompatible fields | Indices checked | Indices | Size | Docs |\n|---------------------|-----------------|---------|------|------|\n| -- | -- | -- | -- | 0 |\n'
      );
    });
  });

  describe('getDataQualitySummaryMarkdownComment', () => {
    test('it returns the expected comment', () => {
      expect(
        getDataQualitySummaryMarkdownComment({
          formatBytes,
          formatNumber,
          totalDocsCount: 3343719,
          totalIncompatible: 4,
          totalIndices: 30,
          totalIndicesChecked: 2,
          sizeInBytes: 4294967296,
        })
      ).toEqual(
        '# Data quality\n\n| Incompatible fields | Indices checked | Indices | Size | Docs |\n|---------------------|-----------------|---------|------|------|\n| 4 | 2 | 30 | 4GB | 3,343,719 |\n\n'
      );
    });

    test('it returns the expected comment when optional values are undefined', () => {
      expect(
        getDataQualitySummaryMarkdownComment({
          formatBytes,
          formatNumber,
          totalDocsCount: undefined,
          totalIncompatible: undefined,
          totalIndices: undefined,
          totalIndicesChecked: undefined,
          sizeInBytes: undefined,
        })
      ).toEqual(
        '# Data quality\n\n| Incompatible fields | Indices checked | Indices | Size | Docs |\n|---------------------|-----------------|---------|------|------|\n| -- | -- | -- | -- | 0 |\n\n'
      );
    });
  });

  describe('getIlmExplainPhaseCountsMarkdownComment', () => {
    test('it returns the expected comment when _all_ of the counts are greater than zero', () => {
      expect(
        getIlmExplainPhaseCountsMarkdownComment({
          hot: 99,
          warm: 8,
          unmanaged: 77,
          cold: 6,
          frozen: 55,
        })
      ).toEqual('`hot(99)` `warm(8)` `unmanaged(77)` `cold(6)` `frozen(55)`');
    });

    test('it returns the expected comment when _some_ of the counts are greater than zero', () => {
      expect(
        getIlmExplainPhaseCountsMarkdownComment({
          hot: 9,
          warm: 0,
          unmanaged: 2,
          cold: 1,
          frozen: 0,
        })
      ).toEqual('`hot(9)` `unmanaged(2)` `cold(1)`');
    });

    test('it returns the expected comment when _none_ of the counts are greater than zero', () => {
      expect(
        getIlmExplainPhaseCountsMarkdownComment({
          hot: 0,
          warm: 0,
          unmanaged: 0,
          cold: 0,
          frozen: 0,
        })
      ).toEqual('');
    });
  });

  describe('getPatternSummaryMarkdownComment', () => {
    test('it returns the expected comment when the rollup contains results for all of the indices in the pattern', () => {
      expect(
        getPatternSummaryMarkdownComment({
          formatBytes,
          formatNumber,
          patternRollup: auditbeatWithAllResults,
        })
      ).toEqual(
        '## auditbeat-*\n`hot(1)` `unmanaged(2)`\n\n| Incompatible fields | Indices checked | Indices | Size | Docs |\n|---------------------|-----------------|---------|------|------|\n| 4 | 3 | 3 | 17.9MB | 19,127 |\n\n'
      );
    });

    test('it returns the expected comment when the rollup contains no results', () => {
      expect(
        getPatternSummaryMarkdownComment({
          formatBytes,
          formatNumber,
          patternRollup: auditbeatNoResults,
        })
      ).toEqual(
        '## auditbeat-*\n`hot(1)` `unmanaged(2)`\n\n| Incompatible fields | Indices checked | Indices | Size | Docs |\n|---------------------|-----------------|---------|------|------|\n| -- | 0 | 3 | 17.9MB | 19,127 |\n\n'
      );
    });

    test('it returns the expected comment when the rollup does NOT have `ilmExplainPhaseCounts`', () => {
      const noIlmExplainPhaseCounts: PatternRollup = {
        ...auditbeatWithAllResults,
        ilmExplainPhaseCounts: undefined, // <--
      };

      expect(
        getPatternSummaryMarkdownComment({
          formatBytes,
          formatNumber,
          patternRollup: noIlmExplainPhaseCounts,
        })
      ).toEqual(
        '## auditbeat-*\n\n\n| Incompatible fields | Indices checked | Indices | Size | Docs |\n|---------------------|-----------------|---------|------|------|\n| 4 | 3 | 3 | 17.9MB | 19,127 |\n\n'
      );
    });

    test('it returns the expected comment when `docsCount` is undefined', () => {
      const noDocsCount: PatternRollup = {
        ...auditbeatWithAllResults,
        docsCount: undefined, // <--
      };

      expect(
        getPatternSummaryMarkdownComment({
          formatBytes,
          formatNumber,
          patternRollup: noDocsCount,
        })
      ).toEqual(
        '## auditbeat-*\n`hot(1)` `unmanaged(2)`\n\n| Incompatible fields | Indices checked | Indices | Size | Docs |\n|---------------------|-----------------|---------|------|------|\n| 4 | 3 | 3 | 17.9MB | 0 |\n\n'
      );
    });
  });
});
