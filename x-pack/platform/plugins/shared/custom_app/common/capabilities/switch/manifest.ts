/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { describedInputProps } from '@kbn/custom-app-common';

export const switchCapability = defineCapability({
  kind: 'component',
  id: 'switch',
  version: 1,
  props: lazySchema(() =>
    z.object({
      ...describedInputProps(),
      bind: describedInputProps().bind.describe(
        'The true or false value of the app that the switch sets. It must be declared as a boolean.'
      ),
    })
  ),
  doc: {
    summary:
      'An on/off switch. Its key must be declared { "type": "boolean", "default": true|false }, and a query uses it as ?name, which is true or false, for example WHERE ?show_errors OR log.level != "error".',
    whenToUse: 'For something that is on or off, such as showing annotations.',
    example: { type: 'switch', id: 'details', label: 'Show details', bind: 'show_details' },
  },
  events: { onChange: 'onChange' },
  bindings: (node) => [node.bind],
  bindingType: 'boolean',
  filter: true,
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    switch: CapabilityNodeOf<typeof switchCapability>;
  }
}
