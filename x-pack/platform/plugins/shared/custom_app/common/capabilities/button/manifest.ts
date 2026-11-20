/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { actionsSchema } from '@kbn/custom-app-common';
import { MAX_HEADING_LENGTH } from '@kbn/custom-app-common';

export const buttonCapability = defineCapability({
  kind: 'component',
  id: 'button',
  version: 1,
  props: lazySchema(() =>
    z.object({
      label: z.string().min(1).max(MAX_HEADING_LENGTH).describe('The words on the button.'),
      onClick: actionsSchema.default([]).describe('The actions to run when it is pressed.'),
    })
  ),
  doc: {
    summary: 'A button. Its main use is to run a Workflow (see below).',
    whenToUse: 'To let people do something. To move to another page use link.',
    example: { type: 'button', id: 'go', label: 'Clear', onClick: [] },
  },
  events: { onClick: 'onClick' },
  compact: true,
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    button: CapabilityNodeOf<typeof buttonCapability>;
  }
}
