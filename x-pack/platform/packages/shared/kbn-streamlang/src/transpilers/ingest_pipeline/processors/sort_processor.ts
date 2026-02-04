/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';

interface SortIngestProcessor {
  field: string;
  target_field?: string;
  order?: 'asc' | 'desc';
  ignore_missing?: boolean;
  ignore_failure?: boolean;
  if?: string;
  description?: string;
  tag?: string;
}

/**
 * Processes a sort processor, handling the ignore_missing flag.
 *
 * Since the native ES sort processor doesn't support ignore_missing,
 * we simulate it by adding a Painless condition that checks if the field exists.
 *
 * When ignore_missing is true and no 'where' condition:
 *   "if": "ctx.containsKey('field') && ctx['field'] != null"
 *
 * When ignore_missing is true with 'where' condition:
 *   The existence check is prepended to the existing Painless script.
 */
export function processSortProcessor(processor: SortIngestProcessor): IngestProcessorContainer[] {
  const { ignore_missing, field, ...restProcessor } = processor;

  let finalCondition: string | undefined;

  if (ignore_missing) {
    // Build the field existence check
    const existenceCheck = `ctx.containsKey('${field}') && ctx['${field}'] != null`;

    if (processor.if) {
      finalCondition = `
  if (!(${existenceCheck})) {
    return false;
  }
  ${processor.if}
`;
    } else {
      finalCondition = existenceCheck;
    }
  } else {
    finalCondition = processor.if;
  }

  const sortProcessor: IngestProcessorContainer = {
    sort: {
      field,
      ...restProcessor,
      ...(finalCondition ? { if: finalCondition } : {}),
    },
  };

  return [sortProcessor];
}
