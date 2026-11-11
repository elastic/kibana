/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { MAX_HEADING_LENGTH, MAX_KEY_VALUE_FIELDS } from '@kbn/custom-app-common';
import { describedDataFields } from '@kbn/custom-app-common';

export const keyValueCapability = defineCapability({
  kind: 'component',
  id: 'key_value',
  version: 1,
  props: lazySchema(() =>
    z.object({
      ...describedDataFields('The first row is shown as pairs of a name and a value.'),
      fields: z
        .array(z.string().min(1).max(MAX_HEADING_LENGTH))
        .max(MAX_KEY_VALUE_FIELDS)
        .optional()
        .describe('Which columns to show. Every column of the first row when left out.'),
    })
  ),
  doc: {
    summary: 'every row of its query or source (up to 25), each as a group of fields.',
    whenToUse: 'For the details of one thing, as in a flyout. For many rows use table.',
    example: { type: 'key_value', id: 'detail', query: 'FROM logs-* | LIMIT 1' },
  },
  data: 'query_or_source',
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    key_value: CapabilityNodeOf<typeof keyValueCapability>;
  }
}
