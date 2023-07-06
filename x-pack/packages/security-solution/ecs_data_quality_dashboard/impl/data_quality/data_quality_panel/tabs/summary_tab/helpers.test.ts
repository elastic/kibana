/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { EcsVersion } from '@kbn/ecs';
import { euiThemeVars } from '@kbn/ui-theme';
import { EMPTY_STAT } from '../../../helpers';

import { mockPartitionedFieldMetadata } from '../../../mock/partitioned_field_metadata/mock_partitioned_field_metadata';
import { PartitionedFieldMetadata } from '../../../types';
import {
  ALL_TAB_ID,
  CUSTOM_TAB_ID,
  ECS_COMPLIANT_TAB_ID,
  INCOMPATIBLE_TAB_ID,
} from '../../index_properties/helpers';
import {
  CUSTOM_FIELDS,
  ECS_COMPLIANT_FIELDS,
  INCOMPATIBLE_FIELDS,
  UNKNOWN,
} from '../../index_properties/translations';
import {
  CategoryId,
  getFillColor,
  getMarkdownComments,
  getNodeLabel,
  getSummaryData,
  getTabId,
} from './helpers';

describe('helpers', () => {
  describe('getSummaryData', () => {
    test('it returns the expected `SummaryData`', () => {
      expect(getSummaryData(mockPartitionedFieldMetadata)).toEqual([
        { categoryId: 'incompatible', mappings: 3 },
        { categoryId: 'custom', mappings: 4 },
        { categoryId: 'ecs-compliant', mappings: 2 },
      ]);
    });
  });

  describe('getFillColor', () => {
    const invalid: CategoryId = 'invalid-category-id' as CategoryId;

    const categories: Array<{
      categoryId: CategoryId;
      expectedColor: string;
    }> = [
      {
        categoryId: 'incompatible',
        expectedColor: euiThemeVars.euiColorDanger,
      },
      {
        categoryId: 'custom',
        expectedColor: euiThemeVars.euiColorLightShade,
      },
      {
        categoryId: 'ecs-compliant',
        expectedColor: euiThemeVars.euiColorSuccess,
      },
      {
        categoryId: invalid,
        expectedColor: euiThemeVars.euiColorGhost,
      },
    ];

    categories.forEach(({ categoryId, expectedColor }) => {
      test(`it returns the expected color for category '${categoryId}'`, () => {
        expect(getFillColor(categoryId)).toEqual(expectedColor);
      });
    });
  });

  describe('getNodeLabel', () => {
    const invalid: CategoryId = 'invalid-category-id' as CategoryId;

    const categories: Array<{
      categoryId: CategoryId;
      expectedLabel: string;
    }> = [
      {
        categoryId: 'incompatible',
        expectedLabel: INCOMPATIBLE_FIELDS,
      },
      {
        categoryId: 'custom',
        expectedLabel: CUSTOM_FIELDS,
      },
      {
        categoryId: 'ecs-compliant',
        expectedLabel: ECS_COMPLIANT_FIELDS,
      },
      {
        categoryId: invalid,
        expectedLabel: UNKNOWN,
      },
    ];

    categories.forEach(({ categoryId, expectedLabel }) => {
      test(`it returns the expected label for category '${categoryId}'`, () => {
        expect(getNodeLabel(categoryId)).toEqual(expectedLabel);
      });
    });
  });

  describe('getTabId', () => {
    const groupByFields: Array<{
      groupByField: string;
      expectedTabId: string;
    }> = [
      {
        groupByField: 'incompatible',
        expectedTabId: INCOMPATIBLE_TAB_ID,
      },
      {
        groupByField: 'custom',
        expectedTabId: CUSTOM_TAB_ID,
      },
      {
        groupByField: 'ecs-compliant',
        expectedTabId: ECS_COMPLIANT_TAB_ID,
      },
      {
        groupByField: 'some-other-group',
        expectedTabId: ALL_TAB_ID,
      },
    ];

    groupByFields.forEach(({ groupByField, expectedTabId }) => {
      test(`it returns the expected tab ID for groupByField '${groupByField}'`, () => {
        expect(getTabId(groupByField)).toEqual(expectedTabId);
      });
    });
  });

  describe('getMarkdownComments', () => {
    const defaultBytesFormat = '0,0.[0]b';
    const formatBytes = (value: number | undefined) =>
      value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

    const defaultNumberFormat = '0,0.[000]';
    const formatNumber = (value: number | undefined) =>
      value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

    test('it returns the expected comment when the index has incompatible fields ', () => {
      expect(
        getMarkdownComments({
          docsCount: 4,
          formatBytes,
          formatNumber,
          ilmPhase: 'unmanaged',
          indexName: 'auditbeat-custom-index-1',
          partitionedFieldMetadata: mockPartitionedFieldMetadata,
          pattern: 'auditbeat-*',
          patternDocsCount: 57410,
          sizeInBytes: 28413,
        })
      ).toEqual([
        '### auditbeat-custom-index-1\n',
        '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 | `unmanaged` | 27.7KB |\n\n',
        '### **Incompatible fields** `3` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
        `#### 3 incompatible fields, 0 fields with mappings in the same family\n\nFields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version ${EcsVersion}.\n\nIncompatible fields with mappings in the same family have exactly the same search behavior but may have different space usage or performance characteristics.\n\nWhen an incompatible field is not in the same family:\n❌ Detection engine rules referencing these fields may not match them correctly\n❌ Pages may not display some events or fields due to unexpected field mappings or values\n❌ Mappings or field values that don't comply with ECS are not supported\n`,
        '\n#### Incompatible field mappings - auditbeat-custom-index-1\n\n\n| Field | ECS mapping type (expected) | Index mapping type (actual) | \n|-------|-----------------------------|-----------------------------|\n| host.name | `keyword` | `text`  |\n| source.ip | `ip` | `text`  |\n\n#### Incompatible field values - auditbeat-custom-index-1\n\n\n| Field | ECS values (expected) | Document values (actual) | \n|-------|-----------------------|--------------------------|\n| event.category | `authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web` | `an_invalid_category` (2), `theory` (1) |\n\n',
      ]);
    });

    test('it returns an empty array when the index does NOT have incompatible fields ', () => {
      const noIncompatible: PartitionedFieldMetadata = {
        ...mockPartitionedFieldMetadata,
        incompatible: [], // <-- no incompatible fields
      };

      expect(
        getMarkdownComments({
          docsCount: 4,
          formatBytes,
          formatNumber,
          ilmPhase: 'unmanaged',
          indexName: 'auditbeat-custom-index-1',
          partitionedFieldMetadata: noIncompatible,
          pattern: 'auditbeat-*',
          patternDocsCount: 57410,
          sizeInBytes: 28413,
        })
      ).toEqual([]);
    });

    test('it returns a missing timestamp comment for an empty index', () => {
      const emptyIndex: PartitionedFieldMetadata = {
        all: [],
        ecsCompliant: [],
        custom: [],
        incompatible: [
          {
            description:
              'Date/time when the event originated. This is the date/time extracted from the event, typically representing when the event was generated by the source. If the event source has no original timestamp, this value is typically populated by the first time the event was received by the pipeline. Required field for all events.',
            hasEcsMetadata: true,
            indexFieldName: '@timestamp',
            indexFieldType: '-',
            indexInvalidValues: [],
            isEcsCompliant: false,
            isInSameFamily: false,
            type: 'date',
          },
        ],
      };

      expect(
        getMarkdownComments({
          docsCount: 0,
          formatBytes,
          formatNumber,
          ilmPhase: 'unmanaged',
          indexName: 'auditbeat-custom-empty-index-1',
          partitionedFieldMetadata: emptyIndex,
          pattern: 'auditbeat-*',
          patternDocsCount: 57410,
          sizeInBytes: 247,
        })
      ).toEqual([
        '### auditbeat-custom-empty-index-1\n',
        '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ❌ | auditbeat-custom-empty-index-1 | 0 (0.0%) | 1 | `unmanaged` | 247B |\n\n',
        '### **Incompatible fields** `1` **Custom fields** `0` **ECS compliant fields** `0` **All fields** `0`\n',
        `#### 1 incompatible field, 0 fields with mappings in the same family\n\nFields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version ${EcsVersion}.\n\nIncompatible fields with mappings in the same family have exactly the same search behavior but may have different space usage or performance characteristics.\n\nWhen an incompatible field is not in the same family:\n❌ Detection engine rules referencing these fields may not match them correctly\n❌ Pages may not display some events or fields due to unexpected field mappings or values\n❌ Mappings or field values that don't comply with ECS are not supported\n`,
        '\n#### Incompatible field mappings - auditbeat-custom-empty-index-1\n\n\n| Field | ECS mapping type (expected) | Index mapping type (actual) | \n|-------|-----------------------------|-----------------------------|\n| @timestamp | `date` | `-`  |\n\n\n',
        '#### Missing an @timestamp (date) field mapping for this index\n\nConsider adding an @timestamp (date) field mapping to this index, as required by the Elastic Common Schema (ECS), because:\n\n❌ Detection engine rules referencing these fields may not match them correctly\n❌ Pages may not display some events or fields due to unexpected field mappings or values\n',
      ]);
    });
  });
});
