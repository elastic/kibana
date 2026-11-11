/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { bindable, cardIconSchema } from '@kbn/custom-app-common';
import { MAX_HEADING_LENGTH, MAX_TEXT_LENGTH } from '@kbn/custom-app-common';

export const cardCapability = defineCapability({
  kind: 'component',
  id: 'card',
  version: 1,
  props: lazySchema(() =>
    z.object({
      title: z
        .string()
        .max(MAX_HEADING_LENGTH)
        .optional()
        .describe('The title of the card. It may use {{state.key}}.'),
      description: z
        .string()
        .max(MAX_TEXT_LENGTH)
        .optional()
        .describe('A line under the title. It may use {{state.key}}.'),
      icon: bindable(cardIconSchema).describe('An icon from the list, shown next to the title.'),
    })
  ),
  doc: {
    summary:
      'a bordered card that groups what is in it, with a title, a line of description and an icon from: alert, bell, bolt, calendar, check, clock, database, flag, gear, globe, heart, lock, search, user, users. Use cards to make parts of a page stand out, such as a summary above a chart.',
    whenToUse: 'To make a part of a page stand out.',
    example: { type: 'card', id: 'summary', title: 'Summary', children: [] },
  },
  interpolated: ['title', 'description'],
  bound: { icon: { schema: cardIconSchema, kind: 'string' } },
  container: true,
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    card: CapabilityNodeOf<typeof cardCapability> & { children: AppNode[] };
  }
}
