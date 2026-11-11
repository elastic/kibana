/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { bindable, stackDirectionSchema } from '@kbn/custom-app-common';

export const stackCapability = defineCapability({
  kind: 'component',
  id: 'stack',
  version: 1,
  props: lazySchema(() =>
    z.object({
      direction: bindable(stackDirectionSchema).describe(
        'vertical, or horizontal for a row. Vertical when left out.'
      ),
    })
  ),
  doc: {
    summary: 'lays out its children. Use horizontal for a row of filters.',
    whenToUse: 'To lay components out in a column or a row.',
    example: { type: 'stack', id: 'page', direction: 'vertical', children: [] },
  },
  bound: { direction: { schema: stackDirectionSchema, kind: 'string' } },
  container: true,
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    stack: CapabilityNodeOf<typeof stackCapability> & { children: AppNode[] };
  }
}
