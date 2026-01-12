/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { JoinProcessor } from '../../../../types/processors';

/**
 * Transpiles a Streamlang JoinProcessor into an Ingest Pipeline Set processor.
 *
 * @example
 * {
 *   action: 'join',
 *   from: ['field1', 'field2', 'field3'],
 *   to: 'my_joined_field',
 *   delimiter: ', ',
 * }
 *
 * Generates:
 * {
 *   set: {
 *     field: 'my_joined_field',
 *     value: '{{{field1}}}, {{{field2}}}, {{{field3}}}',
 *   },
 * }
 */
export const processJoinProcessor = (
  processor: Omit<JoinProcessor, 'where' | 'action' | 'to'> & { if?: string; field: string }
): IngestProcessorContainer => {
  return {
    set: {
      field: processor.field,
      description: processor.description,
      if: processor.if,
      value: processor.from.map((from) => `{{{${from}}}}`).join(processor.delimiter),
      ignore_failure: processor.ignore_failure,
      tag: processor.customIdentifier,
    },
  };
};
