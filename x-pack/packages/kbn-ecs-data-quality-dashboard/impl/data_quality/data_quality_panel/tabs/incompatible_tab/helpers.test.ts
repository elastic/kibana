/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@kbn/ecs';
import numeral from '@elastic/numeral';

import { EMPTY_STAT } from '../../../helpers';
import { mockPartitionedFieldMetadata } from '../../../mock/partitioned_field_metadata/mock_partitioned_field_metadata';
import {
  DETECTION_ENGINE_RULES_MAY_NOT_MATCH,
  INCOMPATIBLE_FIELDS_WITH,
  MAPPINGS_THAT_CONFLICT_WITH_ECS,
  PAGES_MAY_NOT_DISPLAY_EVENTS,
  WHEN_AN_INCOMPATIBLE_FIELD,
} from '../../index_properties/translations';
import {
  getIncompatibleFieldsMarkdownComment,
  getAllIncompatibleMarkdownComments,
} from './helpers';

describe('helpers', () => {
  describe('getIncompatibleFieldsMarkdownComment', () => {
    test('it returns the expected counts and ECS version', () => {
      expect(
        getIncompatibleFieldsMarkdownComment({
          fieldsInSameFamily: 7,
          incompatible: 11,
        })
      ).toEqual(`#### 11 incompatible fields, 7 fields with mappings in the same family

Fields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version ${EcsVersion}.

${INCOMPATIBLE_FIELDS_WITH}

${WHEN_AN_INCOMPATIBLE_FIELD}
${DETECTION_ENGINE_RULES_MAY_NOT_MATCH}
${PAGES_MAY_NOT_DISPLAY_EVENTS}
${MAPPINGS_THAT_CONFLICT_WITH_ECS}
`);
    });
  });

  describe('getAllIncompatibleMarkdownComments', () => {
    test('it returns the expected collection of comments', () => {
      const defaultNumberFormat = '0,0.[000]';
      const formatNumber = (value: number | undefined): string =>
        value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

      expect(
        getAllIncompatibleMarkdownComments({
          docsCount: 4,
          formatNumber,
          ilmPhase: 'unmanaged',
          indexName: 'auditbeat-custom-index-1',
          partitionedFieldMetadata: mockPartitionedFieldMetadata,
          patternDocsCount: 57410,
        })
      ).toEqual([
        '### auditbeat-custom-index-1\n',
        '| Result | Index | Docs | Incompatible fields | ILM Phase |\n|--------|-------|------|---------------------|-----------|\n| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 | `unmanaged` |\n\n',
        '### **Incompatible fields** `3` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
        `#### 3 incompatible fields, 0 fields with mappings in the same family\n\nFields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version ${EcsVersion}.\n\n${INCOMPATIBLE_FIELDS_WITH}\n\n${WHEN_AN_INCOMPATIBLE_FIELD}\n${DETECTION_ENGINE_RULES_MAY_NOT_MATCH}\n${PAGES_MAY_NOT_DISPLAY_EVENTS}\n${MAPPINGS_THAT_CONFLICT_WITH_ECS}\n`,
        '\n#### Incompatible field mappings - auditbeat-custom-index-1\n\n\n| Field | ECS mapping type (expected) | Index mapping type (actual) | \n|-------|-----------------------------|-----------------------------|\n| host.name | `keyword` | `text`  |\n| source.ip | `ip` | `text`  |\n\n#### Incompatible field values - auditbeat-custom-index-1\n\n\n| Field | ECS values (expected) | Document values (actual) | \n|-------|-----------------------|--------------------------|\n| event.category | `authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web` | `an_invalid_category` (2),\n`theory` (1) |\n\n',
      ]);
    });
  });
});
