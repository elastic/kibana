/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { actionsSchema } from '@kbn/custom-app-common';
import { MAX_HEADING_LENGTH, MAX_TABLE_COLUMNS } from '@kbn/custom-app-common';
import { describedDataFields } from '@kbn/custom-app-common';

export const tableCapability = defineCapability({
  kind: 'component',
  id: 'table',
  version: 1,
  props: lazySchema(() =>
    z.object({
      ...describedDataFields('Every row is shown.'),
      caption: z
        .string()
        .max(MAX_HEADING_LENGTH)
        .optional()
        .describe('Names the table for screen readers.'),
      columns: z
        .array(
          z.object({
            field: z.string().min(1).max(MAX_HEADING_LENGTH).describe('The column of the result.'),
            label: z
              .string()
              .max(MAX_HEADING_LENGTH)
              .optional()
              .describe('The heading shown for it.'),
          })
        )
        .max(MAX_TABLE_COLUMNS)
        .optional()
        .describe(
          'Which columns to show, in order. Every column of the result as text when left out.'
        ),
      onRowClick: actionsSchema
        .default([])
        .describe('The actions to run when a row is clicked, with that row.'),
    })
  ),
  doc: {
    summary: 'every row of its query or source, sortable and paged.',
    whenToUse: 'For rows of data. For a single figure use stat.',
    example: {
      type: 'table',
      id: 'services',
      query: 'FROM logs-* | STATS errors = COUNT(*) BY service',
    },
  },
  events: { onRowClick: 'onRowClick' },
  data: 'query_or_source',
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    table: CapabilityNodeOf<typeof tableCapability>;
  }
}
