/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';

export const accordionCapability = defineCapability({
  kind: 'component',
  id: 'accordion',
  version: 1,
  props: lazySchema(() => z.object({})),
  doc: {
    summary:
      'Holds only "section" components, { label, children, open? } (an accordion section starts open with "open": true). An accordion opens and closes each section. they hold only "section" components, { label, children, open? } (an accordion section starts open with "open": true), and a section is used nowhere else. Tabs show one section at a time; an accordion opens and closes each. Use them to keep a long page short.',
    whenToUse: 'To keep a long page short, with each section opened and closed.',
    example: { type: 'accordion', id: 'details', children: [] },
  },
  container: true,
  validate: (node, { issue }) => {
    (node as unknown as { children: Array<{ id: string; type: string }> }).children
      .filter((child) => child.type !== 'section')
      .forEach((child) =>
        issue(
          `Node "${node.id}" is an accordion and holds only sections, not "${child.id}" (${child.type})`
        )
      );
  },
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    accordion: CapabilityNodeOf<typeof accordionCapability> & { children: AppNode[] };
  }
}
