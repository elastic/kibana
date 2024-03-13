/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { EcsVersion } from '@elastic/ecs';

import {
  getAllSameFamilyMarkdownComments,
  getSameFamilyMarkdownComment,
  getSameFamilyMarkdownTablesComment,
} from './helpers';
import { EMPTY_STAT } from '../../../helpers';
import { mockPartitionedFieldMetadata } from '../../../mock/partitioned_field_metadata/mock_partitioned_field_metadata';
import { mockPartitionedFieldMetadataWithSameFamily } from '../../../mock/partitioned_field_metadata/mock_partitioned_field_metadata_with_same_family';

describe('helpers', () => {
  describe('getSameFamilyMarkdownComment', () => {
    test('it returns the expected counts and ECS version', () => {
      expect(getSameFamilyMarkdownComment(7)).toEqual(`#### 7 Same family field mappings

These fields are defined by the Elastic Common Schema (ECS), version ${EcsVersion}, but their mapping types don't exactly match.

Fields with mappings in the same family have exactly the same search behavior as the type specified by ECS, but may have different space usage or performance characteristics.
`);
    });
  });

  describe('getSameFamilyMarkdownTablesComment', () => {
    test('it returns the expected comment when the index has same family mappings', () => {
      const expected = `\n#### Same family field mappings - auditbeat-custom-index-1\n\n\n| Field | ECS mapping type (expected) | Index mapping type (actual) | \n|-------|-----------------------------|-----------------------------|\n| agent.type | \`keyword\` | \`constant_keyword\` \`same family\` |\n\n`;

      expect(
        getSameFamilyMarkdownTablesComment({
          sameFamilyMappings: [
            {
              dashed_name: 'agent-type',
              description:
                'Type of the agent.\nThe agent type always stays the same and should be given by the agent used. In case of Filebeat the agent would always be Filebeat also if two Filebeat instances are run on the same machine.',
              example: 'filebeat',
              flat_name: 'agent.type',
              ignore_above: 1024,
              level: 'core',
              name: 'type',
              normalize: [],
              short: 'Type of the agent.',
              type: 'keyword',
              indexFieldName: 'agent.type',
              indexFieldType: 'constant_keyword',
              indexInvalidValues: [],
              hasEcsMetadata: true,
              isEcsCompliant: false,
              isInSameFamily: true,
            },
          ],
          indexName: 'auditbeat-custom-index-1',
        })
      ).toEqual(expected);
    });

    test('it returns the expected comment when the index does NOT have same family mappings', () => {
      expect(
        getSameFamilyMarkdownTablesComment({
          sameFamilyMappings: [],
          indexName: 'auditbeat-custom-index-1',
        })
      ).toEqual('\n\n');
    });
  });

  describe('getAllSameFamilyMarkdownComments', () => {
    const defaultBytesFormat = '0,0.[0]b';
    const formatBytes = (value: number | undefined) =>
      value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

    const defaultNumberFormat = '0,0.[000]';
    const formatNumber = (value: number | undefined) =>
      value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

    test('it returns the expected collection of comments', () => {
      expect(
        getAllSameFamilyMarkdownComments({
          docsCount: 4,
          formatBytes,
          formatNumber,
          ilmPhase: 'unmanaged',
          indexName: 'auditbeat-custom-index-1',
          isILMAvailable: true,
          partitionedFieldMetadata: mockPartitionedFieldMetadataWithSameFamily,
          patternDocsCount: 57410,
          sizeInBytes: 28413,
        })
      ).toEqual([
        '### auditbeat-custom-index-1\n',
        '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 | `unmanaged` | 27.7KB |\n\n',
        '### **Incompatible fields** `3` **Same family** `1` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `10`\n',
        `#### 1 Same family field mapping\n\nThis field is defined by the Elastic Common Schema (ECS), version ${EcsVersion}, but its mapping type doesn't exactly match.\n\nFields with mappings in the same family have exactly the same search behavior as the type specified by ECS, but may have different space usage or performance characteristics.\n`,
        '\n#### Same family field mappings - auditbeat-custom-index-1\n\n\n| Field | ECS mapping type (expected) | Index mapping type (actual) | \n|-------|-----------------------------|-----------------------------|\n| agent.type | `keyword` | `constant_keyword` `same family` |\n\n',
      ]);
    });

    test('it returns the expected comment when `sameFamily` is empty', () => {
      expect(
        getAllSameFamilyMarkdownComments({
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
      ).toEqual([
        '### auditbeat-custom-index-1\n',
        '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 | `unmanaged` | 27.7KB |\n\n',
        '### **Incompatible fields** `3` **Same family** `0` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
        '\n\n',
      ]);
    });
  });
});
