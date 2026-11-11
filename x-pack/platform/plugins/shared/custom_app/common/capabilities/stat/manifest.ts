/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { casesSourceSchema, querySchema } from '@kbn/custom-app-common';
import { MAX_HEADING_LENGTH } from '@kbn/custom-app-common';

export const statCapability = defineCapability({
  kind: 'component',
  id: 'stat',
  version: 1,
  props: lazySchema(() =>
    z.object({
      title: z
        .string()
        .max(MAX_HEADING_LENGTH)
        .describe('What the number is, shown under it. It may use {{state.key}}.'),
      query: querySchema
        .optional()
        .describe('An ES|QL query. The number is the first column of the first row.'),
      source: casesSourceSchema
        .optional()
        .describe('Cases in place of a query. With "count": true it is how many cases match.'),
    })
  ),
  doc: {
    summary:
      'One number: the FIRST column of the FIRST row of its query. With a cases source and "count": true it shows how many cases match. It needs a query or a source, and one of them only.',
    whenToUse:
      'For a single figure such as a total. For a number over time use a chart, an embeddable of type vis.',
    example: {
      type: 'stat',
      id: 'errors',
      title: 'Errors',
      query: 'FROM logs-* | STATS errors = COUNT(*)',
    },
  },
  interpolated: ['title'],
  data: 'query_or_source',
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    stat: CapabilityNodeOf<typeof statCapability>;
  }
}
