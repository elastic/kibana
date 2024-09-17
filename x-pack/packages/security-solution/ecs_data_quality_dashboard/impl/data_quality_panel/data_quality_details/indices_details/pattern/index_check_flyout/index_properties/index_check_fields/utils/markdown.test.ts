/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';

import {
  eventCategory,
  mockCustomFields,
  mockIncompatibleMappings,
  sourceIpWithTextMapping,
} from '../../../../../../../mock/enriched_field_metadata/mock_enriched_field_metadata';
import { EMPTY_STAT } from '../../../../../../../constants';
import { mockPartitionedFieldMetadata } from '../../../../../../../mock/partitioned_field_metadata/mock_partitioned_field_metadata';
import {
  escapePreserveNewlines,
  getAllowedValues,
  getCustomMarkdownTableRows,
  getIncompatibleMappingsMarkdownTableRows,
  getIncompatibleValuesMarkdownTableRows,
  getIndexInvalidValues,
  getMarkdownComment,
  getMarkdownTable,
  getSameFamilyBadge,
  getSummaryMarkdownComment,
  getSummaryTableMarkdownComment,
  getTabCountsMarkdownComment,
} from './markdown';
import {
  ECS_MAPPING_TYPE_EXPECTED,
  FIELD,
  INDEX_MAPPING_TYPE_ACTUAL,
} from '../tabs/compare_fields_table/translations';
import { mockAllowedValues } from '../../../../../../../mock/allowed_values/mock_allowed_values';
import { EcsBasedFieldMetadata, UnallowedValueCount } from '../../../../../../../types';
import { INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE } from '../tabs/incompatible_tab/translations';
import { escapeNewlines } from '../../../../../../../utils/markdown';
import { SAME_FAMILY_BADGE_LABEL } from '../translate';

const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const defaultNumberFormat = '0,0.[000]';
const formatNumber = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

const indexName = 'auditbeat-custom-index-1';

describe('getSummaryTableMarkdownComment', () => {
  test('it returns the expected comment', () => {
    expect(
      getSummaryTableMarkdownComment({
        docsCount: 4,
        formatBytes,
        formatNumber,
        ilmPhase: 'unmanaged',
        indexName: 'auditbeat-custom-index-1',
        isILMAvailable: true,
        partitionedFieldMetadata: mockPartitionedFieldMetadata,
        patternDocsCount: 57410,
        sizeInBytes: 28413,
      })
    ).toEqual(
      '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 | `unmanaged` | 27.7KB |\n\n'
    );
  });

  test('it returns the expected comment when isILMAvailable is false', () => {
    expect(
      getSummaryTableMarkdownComment({
        docsCount: 4,
        formatBytes,
        formatNumber,
        ilmPhase: 'unmanaged',
        indexName: 'auditbeat-custom-index-1',
        isILMAvailable: false,
        partitionedFieldMetadata: mockPartitionedFieldMetadata,
        patternDocsCount: 57410,
        sizeInBytes: undefined,
      })
    ).toEqual(
      '| Result | Index | Docs | Incompatible fields |\n|--------|-------|------|---------------------|\n| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 |\n\n'
    );
  });

  test('it returns the expected comment when sizeInBytes is undefined', () => {
    expect(
      getSummaryTableMarkdownComment({
        docsCount: 4,
        formatBytes,
        formatNumber,
        ilmPhase: 'unmanaged',
        indexName: 'auditbeat-custom-index-1',
        isILMAvailable: false,
        partitionedFieldMetadata: mockPartitionedFieldMetadata,
        patternDocsCount: 57410,
        sizeInBytes: undefined,
      })
    ).toEqual(
      '| Result | Index | Docs | Incompatible fields |\n|--------|-------|------|---------------------|\n| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 |\n\n'
    );
  });
});

describe('escapeNewlines', () => {
  test('it returns undefined when `content` is undefined', () => {
    expect(escapeNewlines(undefined)).toBeUndefined();
  });

  test("it returns the content unmodified when there's nothing to escape", () => {
    const content = "there's nothing to escape in this content";
    expect(escapeNewlines(content)).toEqual(content);
  });

  test('it replaces all newlines in the content with spaces', () => {
    const content = '\nthere were newlines in the beginning, middle,\nand end\n';
    expect(escapeNewlines(content)).toEqual(
      ' there were newlines in the beginning, middle, and end '
    );
  });

  test('it escapes all column separators in the content with spaces', () => {
    const content = '|there were column separators in the beginning, middle,|and end|';
    expect(escapeNewlines(content)).toEqual(
      '\\|there were column separators in the beginning, middle,\\|and end\\|'
    );
  });

  test('it escapes content containing BOTH newlines and column separators', () => {
    const content =
      '|\nthere were newlines and column separators in the beginning, middle,\n|and end|\n';
    expect(escapeNewlines(content)).toEqual(
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
});

describe('getSameFamilyBadge', () => {
  test('it returns the expected badge text when the field is in the same family', () => {
    const inSameFamily = {
      ...eventCategory,
      isInSameFamily: true,
    };

    expect(getSameFamilyBadge(inSameFamily)).toEqual(`\`${SAME_FAMILY_BADGE_LABEL}\``);
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
    const eventCategoryWithWildcard: EcsBasedFieldMetadata = {
      ...eventCategory, // `event.category` is a `keyword` per the ECS spec
      indexFieldType: 'wildcard', // this index has a mapping of `wildcard` instead of `keyword`
      isInSameFamily: true, // `wildcard` and `keyword` are in the same family
    };

    expect(
      getIncompatibleMappingsMarkdownTableRows([eventCategoryWithWildcard, sourceIpWithTextMapping])
    ).toEqual(
      '| event.category | `keyword` | `wildcard` `same family` |\n| source.ip | `ip` | `text`  |'
    );
  });

  test('it returns the expected table rows when the field is NOT in the same family', () => {
    const eventCategoryWithText: EcsBasedFieldMetadata = {
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
      '### **Incompatible fields** `3` **Same family** `0` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n'
    );
  });
});
