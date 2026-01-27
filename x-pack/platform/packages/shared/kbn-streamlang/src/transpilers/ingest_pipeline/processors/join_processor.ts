/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { JoinProcessor } from '../../../../types/processors';

/**
 * Converts a JoinProcessor to an Ingest Pipeline script processor.
 *
 * @example
 * Input:
 *   { action: 'join', from: ['field1', 'field2'], delimiter: ', ', to: 'my_joined_field' }
 *
 * Output:
 *   { script: { lang: 'painless', source: "
 *    def fields = [];
 *    boolean allPresent = true;
 *
 *    if (ctx.containsKey('field1') && ctx['field1'] != null) {
 *      fields.add(ctx['field1']);
 *    } else {
 *      allPresent = false;
 *    }
 *
 *    if (ctx.containsKey('field2') && ctx['field2'] != null) {
 *      fields.add(ctx['field2']);
 *    } else {
 *      allPresent = false;
 *    }
 *
 *    if (false || allPresent) {
 *      ctx['my_joined_field'] = fields.stream().collect(Collectors.joining(', '));
 *    }
 *   " } }
 */
export const processJoinProcessor = (
  processor: Omit<JoinProcessor, 'where' | 'action' | 'to'> & {
    if?: string;
    field: string;
    tag?: string;
  }
): IngestProcessorContainer => {
  const { ignore_missing = false } = processor;
  // Generate the script to join non-empty fields into a single string
  // Handle `ignore_missing: false` - don't join fields if any of them are missing
  const source = `
def fields = [];
boolean allPresent = true;
${processor.from
  .map(
    (fromField) => `
if (ctx.containsKey('${fromField}') && ctx['${fromField}'] != null) {
  fields.add(ctx['${fromField}']);
} else {
  allPresent = false;
}
`
  )
  .join('')}
if (${ignore_missing} || allPresent) {
  ctx['${processor.field}'] = fields.stream().collect(Collectors.joining('${processor.delimiter}'));
}
  `.trim();

  return {
    script: {
      lang: 'painless',
      source,
      tag: processor.tag,
      if: processor.if,
      ignore_failure: processor.ignore_failure,
    },
  };
};
