/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { badgeColorSchema, bindable } from '@kbn/custom-app-common';
import { MAX_HEADING_LENGTH } from '@kbn/custom-app-common';

export const badgeCapability = defineCapability({
  kind: 'component',
  id: 'badge',
  version: 1,
  props: lazySchema(() =>
    z.object({
      text: z
        .string()
        .min(1)
        .max(MAX_HEADING_LENGTH)
        .describe('The word or two shown in the badge. It may use {{state.key}}.'),
      color: bindable(badgeColorSchema).describe('The colour. A plain grey badge when left out.'),
    })
  ),
  doc: {
    summary: 'A short coloured word, such as a status.',
    whenToUse: 'To label something with a status. For a number use stat.',
    example: { type: 'badge', id: 'status', text: 'Healthy', color: 'success' },
  },
  interpolated: ['text'],
  bound: { color: { schema: badgeColorSchema, kind: 'string' } },
  compact: true,
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    badge: CapabilityNodeOf<typeof badgeCapability>;
  }
}
