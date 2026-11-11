/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { bindable, calloutColorSchema } from '@kbn/custom-app-common';
import { MAX_HEADING_LENGTH, MAX_TEXT_LENGTH } from '@kbn/custom-app-common';

export const calloutCapability = defineCapability({
  kind: 'component',
  id: 'callout',
  version: 1,
  props: lazySchema(() =>
    z.object({
      title: z
        .string()
        .max(MAX_HEADING_LENGTH)
        .describe('What it says, in plain text. It may use {{state.key}}.'),
      text: z
        .string()
        .max(MAX_TEXT_LENGTH)
        .optional()
        .describe('A line more, in plain text. It may use {{state.key}}.'),
      color: bindable(calloutColorSchema).describe('How serious it is. Primary when left out.'),
    })
  ),
  doc: {
    summary: 'A boxed message with a colour. A callout is plain text, so no Markdown in it.',
    whenToUse: 'To point something out or warn of it. For a status word use badge.',
    example: { type: 'callout', id: 'note', title: 'Data is delayed', color: 'warning' },
  },
  interpolated: ['title', 'text'],
  bound: { color: { schema: calloutColorSchema, kind: 'string' } },
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    callout: CapabilityNodeOf<typeof calloutCapability>;
  }
}
