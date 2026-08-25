/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ConcatProcessor } from '../../../../types/processors';

/**
 * Converts a ConcatProcessor to an Ingest Pipeline script processor.
 *
 * @example
 * Input:
    {
        action: 'concat',
        from: [
            { type: 'field', value: 'first_name' },
            { type: 'literal', value: ' ' },
            { type: 'field', value: 'last_name' }
        ],
        to: 'full_name',
      }

 * Output:
    {
        script: {
            source: 'ctx[\'full_name\'] = ctx[\'first_name\'] + " " + ctx[\'last_name\'];',
            lang: 'painless',
        }
    }
 */
export const processConcatProcessor = (
  processor: Omit<ConcatProcessor, 'where' | 'action' | 'to'> & {
    if?: string;
    field: string;
    tag?: string;
  }
): IngestProcessorContainer => {
  const { description, ignore_failure, tag, ignore_missing = false, from, field } = processor;
  // Generate the script to join non-empty fields into a single string
  // Handle `ignore_missing: false` - don't join fields if any of them are missing

  const source = `
  def fromValues = [];
  boolean allFieldsPresent = true;

  ${from
    .map((fromValue) => {
      if (fromValue.type === 'field') {
        return `if (ctx.containsKey('${fromValue.value}') && ctx['${fromValue.value}'] != null) {
  fromValues.add(ctx['${fromValue.value}'].toString());
} else {
  allFieldsPresent = false;
}
`;
      } else {
        return `fromValues.add('${fromValue.value}');`;
      }
    })
    .join('')}

  if (allFieldsPresent || ${ignore_missing}) {
    ctx['${field}'] = fromValues.stream().collect(Collectors.joining(''));
  }
  `.trim();

  const scriptProcessor: IngestProcessorContainer = {
    script: {
      lang: 'painless',
      source,
      if: processor.if,
      ignore_failure,
      description,
      tag,
    },
  };

  return scriptProcessor;
};
