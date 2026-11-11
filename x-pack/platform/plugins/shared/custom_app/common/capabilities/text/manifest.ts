/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { MAX_TEXT_LENGTH } from '@kbn/custom-app-common';

export const textCapability = defineCapability({
  kind: 'component',
  id: 'text',
  version: 1,
  props: lazySchema(() =>
    z.object({
      text: z
        .string()
        .max(MAX_TEXT_LENGTH)
        .describe('The paragraph, in Markdown. It may use {{state.key}}.'),
    })
  ),
  doc: {
    summary:
      'A paragraph written in Markdown (bold, italics, bullet lists, links): put each list item on a line of its own, starting with "- ", and a blank line between paragraphs. A value in a text, {{state.name}}, is shown as it is, whatever it holds.',
    whenToUse: 'For explanations and lists. For a title use heading.',
    example: { type: 'text', id: 'about', text: 'This page shows **traffic** by country.' },
  },
  interpolated: ['text'],
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    text: CapabilityNodeOf<typeof textCapability>;
  }
}
