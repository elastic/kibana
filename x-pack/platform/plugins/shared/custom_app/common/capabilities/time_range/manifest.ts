/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';

export const timeRangeCapability = defineCapability({
  kind: 'component',
  id: 'time_range',
  version: 1,
  props: lazySchema(() => z.object({})),
  doc: {
    summary:
      'A time picker that sets the period of the whole app, which every query is limited to. Put one in the row of filters of an app about data that changes over time; an app has at most one, and without one it keeps the last 24 hours.',
    whenToUse: 'Once in an app that shows things over time.',
    example: { type: 'time_range', id: 'period' },
  },
  validate: (node, { nodes, issue }) => {
    if (nodes.find(({ type }) => type === 'time_range')?.id !== node.id) {
      issue(
        `Node "${node.id}" is a second time range; an app has one, which sets the period of all of it`
      );
    }
  },
  filter: true,
  alignEnd: true,
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    time_range: CapabilityNodeOf<typeof timeRangeCapability>;
  }
}
