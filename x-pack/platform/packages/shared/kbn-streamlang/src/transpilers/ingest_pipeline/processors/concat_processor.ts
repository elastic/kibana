/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ConcatProcessor } from '../../../../types/processors';

/**
 * Converts a ConcatProcessor to an Ingest Pipeline set processor.
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
        set: {
            field: 'full_name',
            value: '{{{first_name}}} {{{last_name}}}',
        }
    }
 */
export const processConcatProcessor = (
  processor: Omit<ConcatProcessor, 'where' | 'action' | 'to'> & {
    if?: string;
    field: string;
  }
): IngestProcessorContainer => {
  let value = '';
  // value is the concatenation of the fields and literals in the from array
  for (const from of processor.from) {
    if (from.type === 'field') {
      value += `{{{${from.value}}}}`;
    } else {
      value += from.value;
    }
  }

  const setProcessor: IngestProcessorContainer = {
    set: {
      field: processor.field,
      value,
      description: processor.description,
      if: processor.if,
      ignore_failure: processor.ignore_failure,
      tag: processor.customIdentifier,
    },
  };

  return setProcessor;
};
