/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema, offeringBasedSchema } from '@kbn/config-schema';
import { ALLOWED_MIME_TYPES } from '../common/constants/mime_types';
import {
  DEFAULT_TASK_INTERVAL_MINUTES,
  DEFAULT_TASK_START_DELAY_MINUTES,
} from '../common/constants/incremental_id';

export const ConfigSchema = schema.object({
  analytics: schema.object({
    index: schema.object({
      enabled: offeringBasedSchema({
        serverless: schema.boolean({ defaultValue: false }),
        traditional: schema.boolean({ defaultValue: false }),
      }),
    }),
  }),
  /**
   * Cases-as-data v2 — cluster-level analytics indices populated by real-time
   * saved-object hooks (see `server/cases_analytics_v2`). Off by default; v1
   * (`analytics.index.enabled`) is the primary path until v2 has been validated
   * in production. Enabling v2 has no effect on v1 — they coexist independently.
   */
  analyticsV2: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
    /**
     * Reconciliation cadence in minutes. The reconciliation task is the
     * durability backstop for v2's fire-and-forget write hooks: every
     * tick it walks cases updated since the previous tick and re-emits
     * their analytics docs. Lower values catch up faster after a hook
     * failure but cost more SO walks against the cases index.
     *
     * Defaults to 30 minutes — fast enough to recover from dropped hooks
     * within an on-call response window, slow enough to keep background
     * read load negligible. Hard floor of 5 minutes prevents misconfigured
     * deployments from hammering ES.
     */
    reconciliationIntervalMinutes: schema.number({
      defaultValue: 30,
      min: 5,
    }),
    /**
     * Gates the cases-analyticsV2 administrator routes that mutate
     * subsystem state — `POST /internal/cases/_analyticsV2/reset` and
     * `POST /internal/cases/_analyticsV2/reconcile/run_soon`. The
     * read-only `GET /internal/cases/_analyticsV2/state` is always
     * registered (it's the surface a future Case Settings page will
     * poll for health info; gating it would break that integration).
     *
     * Default `false` because both gated routes operate **globally**
     * across every space but are invocable from a single space — an
     * operator hitting `/reset` from `default` wipes case data views
     * in every space the cluster knows about. That's exactly what the
     * route is designed for, but a misclick from an unaware tenant can
     * be disruptive. Keeping it off by default forces operators to
     * opt in via `xpack.cases.analyticsV2.enable_debug_mode: true` in
     * `kibana.yml`, which is also the right knob for repeated dev /
     * test invocations during local development.
     *
     * Lives under `analyticsV2` (not the legacy `analytics` namespace,
     * which is the v1-only surface and will eventually be removed) so
     * the gating contract retires alongside the v2 service if both are
     * ever sunset together.
     */
    enable_debug_mode: schema.boolean({ defaultValue: false }),
  }),
  attachments: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
  }),
  markdownPlugins: schema.object({
    lens: schema.boolean({ defaultValue: true }),
  }),
  files: schema.object({
    allowedMimeTypes: schema.arrayOf(schema.string({ minLength: 1 }), {
      defaultValue: ALLOWED_MIME_TYPES,
    }),
    // intentionally not setting a default here so that we can determine if the user set it
    maxSize: schema.maybe(schema.number({ min: 0 })),
  }),
  incrementalId: schema.object({
    /**
     * Whether the incremental id service should be enabled
     */
    enabled: schema.boolean({ defaultValue: true }),
    /**
     * The interval that the task should be scheduled at
     */
    taskIntervalMinutes: schema.number({
      defaultValue: DEFAULT_TASK_INTERVAL_MINUTES,
      min: 5,
    }),
    /**
     * The initial delay the task will be started with
     */
    taskStartDelayMinutes: schema.number({
      defaultValue: DEFAULT_TASK_START_DELAY_MINUTES,
      min: 1,
    }),
  }),
  stack: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
  // NOTE: exposed to the Browser via `exposeToBrowser` setting in cases/server/index.ts
  // WARN: enabling this feature and disabling it later is not supported (saved objects will throw errors)
  templates: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
  }),
  enabled: schema.boolean({ defaultValue: true }),
});

export type ConfigType = TypeOf<typeof ConfigSchema>;
