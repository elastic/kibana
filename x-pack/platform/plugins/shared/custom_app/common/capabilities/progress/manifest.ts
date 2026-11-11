/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { bindable, progressColorSchema, progressMaxSchema } from '@kbn/custom-app-common';
import { MAX_HEADING_LENGTH } from '@kbn/custom-app-common';
import { describedDataFields } from '@kbn/custom-app-common';

export const progressCapability = defineCapability({
  kind: 'component',
  id: 'progress',
  version: 1,
  props: lazySchema(() =>
    z.object({
      label: z
        .string()
        .max(MAX_HEADING_LENGTH)
        .optional()
        .describe('What the bar measures. It may use {{state.key}}.'),
      ...describedDataFields(
        'The bar is the first column of the first row, which must be a number.'
      ),
      max: bindable(progressMaxSchema).describe(
        'The number at which the bar is full. 100 when left out.'
      ),
      color: bindable(progressColorSchema).describe(
        'The colour of the bar. Primary when left out.'
      ),
    })
  ),
  doc: {
    summary:
      'A bar filled as far as the FIRST column of the FIRST row, which must be a number, is of "max" (100 by default). For a percentage leave max alone. It needs a query or a source, and one of them only.',
    whenToUse: 'For a part of a whole, such as a quota used. For a plain figure use stat.',
    example: {
      type: 'progress',
      id: 'quota',
      label: 'Quota used',
      query: 'FROM usage | STATS used = MAX(percent)',
    },
  },
  interpolated: ['label'],
  bound: {
    max: { schema: progressMaxSchema, kind: 'number' },
    color: { schema: progressColorSchema, kind: 'string' },
  },
  data: 'query_or_source',
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    progress: CapabilityNodeOf<typeof progressCapability>;
  }
}
