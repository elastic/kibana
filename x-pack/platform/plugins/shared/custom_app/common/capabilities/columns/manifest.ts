/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { bindable, columnsCountSchema } from '@kbn/custom-app-common';

export const columnsCapability = defineCapability({
  kind: 'component',
  id: 'columns',
  version: 1,
  props: lazySchema(() =>
    z.object({
      columns: bindable(columnsCountSchema).describe(
        'How many columns: 2, 3 or 4. 2 when left out.'
      ),
    })
  ),
  doc: {
    summary:
      'puts its children side by side in that many columns, wrapping under each other on a narrow screen. Use it for a row of metrics or cards.',
    whenToUse: 'For a row of metrics or cards.',
    example: { type: 'columns', id: 'kpis', columns: 3, children: [] },
  },
  bound: { columns: { schema: columnsCountSchema, kind: 'number' } },
  container: true,
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    columns: CapabilityNodeOf<typeof columnsCapability> & { children: AppNode[] };
  }
}
