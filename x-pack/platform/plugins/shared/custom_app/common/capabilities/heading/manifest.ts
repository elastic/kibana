/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { MAX_HEADING_LENGTH } from '@kbn/custom-app-common';

export const headingCapability = defineCapability({
  kind: 'component',
  id: 'heading',
  version: 1,
  props: lazySchema(() =>
    z.object({
      text: z
        .string()
        .max(MAX_HEADING_LENGTH)
        .describe('The words of the heading, in plain text. It may use {{state.key}}.'),
    })
  ),
  doc: {
    summary: 'A heading. It is plain text, so there is no Markdown in it.',
    whenToUse: 'To title a part of the page. For a paragraph use text.',
    example: { type: 'heading', id: 'title', text: 'Traffic' },
  },
  interpolated: ['text'],
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    heading: CapabilityNodeOf<typeof headingCapability>;
  }
}
