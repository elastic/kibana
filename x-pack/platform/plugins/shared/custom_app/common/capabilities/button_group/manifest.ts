/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { MAX_BUTTON_GROUP_OPTIONS } from '@kbn/custom-app-common';
import { describedInputProps, inputOptionSchema } from '@kbn/custom-app-common';

export const buttonGroupCapability = defineCapability({
  kind: 'component',
  id: 'button_group',
  version: 1,
  props: lazySchema(() =>
    z.object({
      ...describedInputProps(),
      options: z
        .array(inputOptionSchema)
        .min(1)
        .max(MAX_BUTTON_GROUP_OPTIONS)
        .describe('The choices, each with a value and an optional label.'),
    })
  ),
  doc: {
    summary:
      'A row of buttons of which one is chosen, which sets a value of the app. At most 10 options.',
    whenToUse: 'For a few choices that should all be seen, such as a period. For many use select.',
    example: {
      type: 'button_group',
      id: 'view',
      label: 'View',
      bind: 'view',
      options: [{ value: 'day' }, { value: 'week' }],
    },
  },
  events: { onChange: 'onChange' },
  bindings: (node) => [node.bind],
  validate: (node, { issue }) => {
    const seen = new Set<string>();
    node.options.forEach(({ value }) => {
      if (seen.has(value)) issue(`Node "${node.id}" has the option "${value}" more than once`);
      seen.add(value);
    });
  },
  filter: true,
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    button_group: CapabilityNodeOf<typeof buttonGroupCapability>;
  }
}
