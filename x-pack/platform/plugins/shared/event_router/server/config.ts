/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  /** Maximum number of events accepted in a single publish request. */
  maxEventsPerRequest: schema.number({ defaultValue: 100, min: 1, max: 1000 }),
  /**
   * Upper bound on a single listener's turnaround. Listeners are only meant to
   * enqueue durable work, so exceeding this is reported as a failure rather
   * than allowed to hold the ingest request open.
   */
  listenerTimeout: schema.duration({ defaultValue: '10s' }),
  exampleListener: schema.object({
    /**
     * Registers a demo event type and a listener that enqueues a Task Manager
     * task, so the end-to-end path can be exercised without wiring a real
     * consumer such as Workflows.
     */
    enabled: schema.boolean({ defaultValue: false }),
  }),
});

export type EventRouterConfig = TypeOf<typeof configSchema>;
