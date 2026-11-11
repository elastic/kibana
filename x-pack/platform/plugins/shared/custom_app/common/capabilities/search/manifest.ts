/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { MAX_HEADING_LENGTH } from '@kbn/custom-app-common';
import { describedInputProps } from '@kbn/custom-app-common';

export const searchCapability = defineCapability({
  kind: 'component',
  id: 'search',
  version: 1,
  props: lazySchema(() =>
    z.object({
      ...describedInputProps(),
      placeholder: z
        .string()
        .max(MAX_HEADING_LENGTH)
        .optional()
        .describe('What is shown while it is empty.'),
    })
  ),
  doc: {
    summary:
      'A box for free text that sets a value of the app after a pause in typing, or at once on Enter.',
    whenToUse: 'To search or filter by a word. For one of a few choices use select.',
    example: { type: 'search', id: 'find', label: 'Search', bind: 'term' },
  },
  events: { onChange: 'onChange' },
  bindings: (node) => [node.bind],
  filter: true,
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    search: CapabilityNodeOf<typeof searchCapability>;
  }
}
