/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { bindable, sectionOpenSchema } from '@kbn/custom-app-common';
import { MAX_HEADING_LENGTH } from '@kbn/custom-app-common';

export const sectionCapability = defineCapability({
  kind: 'component',
  id: 'section',
  version: 1,
  props: lazySchema(() =>
    z.object({
      label: z
        .string()
        .min(1)
        .max(MAX_HEADING_LENGTH)
        .describe('The title of the section. It may use {{state.key}}.'),
      open: bindable(sectionOpenSchema).describe('In an accordion, whether it starts open.'),
    })
  ),
  doc: {
    summary:
      'A titled part of tabs or an accordion, which hold only sections. A section is used nowhere else.',
    whenToUse: 'Only as a child of tabs or an accordion.',
    example: { type: 'section', id: 'overview', label: 'Overview', children: [] },
  },
  interpolated: ['label'],
  bound: { open: { schema: sectionOpenSchema, kind: 'boolean' } },
  container: true,
  validate: (node, { parentOf, issue }) => {
    const parent = parentOf(node.id);
    if (parent?.type !== 'tabs' && parent?.type !== 'accordion') {
      issue(`Node "${node.id}" is a section, which is only part of tabs or an accordion`);
    }
  },
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    section: CapabilityNodeOf<typeof sectionCapability> & { children: AppNode[] };
  }
}
