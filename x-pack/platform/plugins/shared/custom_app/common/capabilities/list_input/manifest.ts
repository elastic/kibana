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

export const listInputCapability = defineCapability({
  kind: 'component',
  id: 'list_input',
  version: 1,
  props: lazySchema(() =>
    z.object({
      ...describedInputProps(),
      bind: describedInputProps().bind.describe(
        'The list value of the app that the box sets. It must be declared as a list.'
      ),
      placeholder: z
        .string()
        .max(MAX_HEADING_LENGTH)
        .optional()
        .describe('What is shown while it is empty.'),
    })
  ),
  doc: {
    summary:
      'A box where people write or paste one value per line, for example the usernames of an incident; the value it sets is a list of those lines, without empty lines and repeats, at most 1000 (see Lists below).',
    whenToUse: 'For several values at once. For one word use search.',
    example: { type: 'list_input', id: 'users', label: 'Users', bind: 'users' },
  },
  events: { onChange: 'onChange' },
  bindings: (node) => [node.bind],
  bindingType: 'list',
  filter: true,
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    list_input: CapabilityNodeOf<typeof listInputCapability>;
  }
}
