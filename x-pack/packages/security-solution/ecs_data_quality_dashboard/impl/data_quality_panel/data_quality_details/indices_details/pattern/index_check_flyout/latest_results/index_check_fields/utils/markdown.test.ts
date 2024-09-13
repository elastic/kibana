/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockCustomFields } from '../../../../../../../mock/enriched_field_metadata/mock_enriched_field_metadata';
import { mockPartitionedFieldMetadata } from '../../../../../../../mock/partitioned_field_metadata/mock_partitioned_field_metadata';
import {
  getCustomMarkdownTableRows,
  getSummaryMarkdownComment,
  getTabCountsMarkdownComment,
} from './markdown';

const indexName = 'auditbeat-custom-index-1';

describe('getCustomMarkdownTableRows', () => {
  test('it returns the expected table rows', () => {
    expect(getCustomMarkdownTableRows(mockCustomFields)).toEqual(
      '| host.name.keyword | `keyword` | `--` |\n| some.field | `text` | `--` |\n| some.field.keyword | `keyword` | `--` |\n| source.ip.keyword | `keyword` | `--` |'
    );
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
