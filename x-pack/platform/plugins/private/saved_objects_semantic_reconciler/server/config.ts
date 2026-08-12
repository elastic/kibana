/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

const pluginConfigSchema = schema.object({
  /** Master switch — when false the plugin does nothing (task not registered or scheduled). */
  enabled: schema.boolean({ defaultValue: true }),

  /**
   * How often the reconciler sweep task fires (Task Manager recurring interval).
   * `requests_per_second` config is a cluster-courtesy knob; at ELSER throughput (~18–33 docs/s
   * on laptop-class hardware) the actual cap is ELSER, not this throttle.
   */
  pollInterval: schema.string({
    defaultValue: '1m',
    validate: (v) => {
      if (!/^\d+[smhd]$/.test(v)) return 'must be a duration string like 30s, 1m, 2h';
    },
    maxLength: 20,
  }),

  /** scroll_size for each UBQ scroll batch. Tune down if ELSER OOMs; tune up for throughput. */
  batchSize: schema.number({ defaultValue: 100, min: 1, max: 10_000 }),

  /**
   * max_docs cap per UBQ invocation per type per cycle. Prevents a single oversized backfill
   * sweep from monopolising ELSER for too long. Docs beyond the cap are picked up next cycle.
   */
  maxDocsPerSweep: schema.number({ defaultValue: 10_000, min: 100, max: 1_000_000 }),

  /**
   * requests_per_second throttle passed to UBQ. Primarily a cluster-courtesy knob — at current
   * ELSER throughput (~18–33 docs/s) this has no observable limiting effect, but provides
   * headroom for faster inference hardware.
   */
  requestsPerSecond: schema.number({ defaultValue: 50, min: 1, max: 10_000 }),
});

export type ReconcilerConfig = TypeOf<typeof pluginConfigSchema>;

export const config: PluginConfigDescriptor<ReconcilerConfig> = {
  schema: pluginConfigSchema,
};
