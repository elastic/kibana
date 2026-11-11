/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { bindable, betterWhenSchema } from '@kbn/custom-app-common';
import { MAX_HEADING_LENGTH } from '@kbn/custom-app-common';
import { describedDataFields } from '@kbn/custom-app-common';

export const metricCapability = defineCapability({
  kind: 'component',
  id: 'metric',
  version: 1,
  props: lazySchema(() =>
    z.object({
      title: z
        .string()
        .max(MAX_HEADING_LENGTH)
        .describe('What the number is, shown under it. It may use {{state.key}}.'),
      ...describedDataFields('The number is the first column of the first row.'),
      compare: z
        .string()
        .min(1)
        .max(MAX_HEADING_LENGTH)
        .optional()
        .describe('The name of another column that holds what the number was before.'),
      betterWhen: bindable(betterWhenSchema).describe(
        'Whether a rise is better or worse. Higher when left out; use lower for errors or latency.'
      ),
    })
  ),
  doc: {
    summary:
      'A number, the FIRST column of the FIRST row, like a stat. With "compare", the name of another column that holds what it was before, it also shows the change in percent, coloured as better or worse ("betterWhen" is "higher" by default; use "lower" for errors or latency). Write the query so that its one row has both numbers, for example by counting the last hour and the hour before it in two columns. It needs a query or a source, and one of them only.',
    whenToUse: 'For a figure and how it changed. For a figure alone use stat.',
    example: {
      type: 'metric',
      id: 'errors',
      title: 'Errors',
      query: 'FROM logs-* | STATS now = COUNT(*), before = COUNT(*)',
      compare: 'before',
      betterWhen: 'lower',
    },
  },
  interpolated: ['title'],
  bound: { betterWhen: { schema: betterWhenSchema, kind: 'string' } },
  data: 'query_or_source',
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    metric: CapabilityNodeOf<typeof metricCapability>;
  }
}
