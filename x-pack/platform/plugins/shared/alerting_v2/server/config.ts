/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import { DEFAULT_MINIMUM_SCHEDULE_INTERVAL, MIN_SCHEDULE_INTERVAL } from '@kbn/alerting-v2-schemas';
import { parseDurationToMs, validateDuration } from './lib/duration';
import type { EsqlResponseFormat } from './lib/services/query_service/formats';

const MINIMUM_SCHEDULE_INTERVAL_DEFAULT = DEFAULT_MINIMUM_SCHEDULE_INTERVAL;
/**
 * Lower bound for `minimumScheduleInterval`. Set below the default so
 * functional tests can relax the guardrail and run rules every few seconds.
 */
const MINIMUM_SCHEDULE_INTERVAL_FLOOR = MIN_SCHEDULE_INTERVAL;
const MAX_MINIMUM_SCHEDULE_INTERVAL = '30d';

/** Default and maximum value of `xpack.alerting_v2.rules.run.alerts.max`. */
const MAX_ALERTS_PER_RUN = 10000;
const DEFAULT_MAX_QUERY_RESPONSE_SIZE = '50mb';
/** Minimum that can still hold a single ES|QL row with metadata. */
const MIN_MAX_QUERY_RESPONSE_SIZE = '1kb';
const MAX_MAX_QUERY_RESPONSE_SIZE = '200mb';

const rulesRunSchema = schema.object({
  alerts: schema.object({
    // default === max: can only be tightened; loosening would be breaking (v1 has no ceiling).
    max: schema.number({ defaultValue: MAX_ALERTS_PER_RUN, min: 1, max: MAX_ALERTS_PER_RUN }),
  }),
  /**
   * Cap on distinct groups a single execution may introduce. Applies to all
   * grouped rule types (new episodes for stateful rules, signal events for
   * signal rules). Already-active groups pass through but their hashes are
   * added to the counter, so available capacity for new groups is
   * `maxGroupsPerExecution − active_groups_already_encountered`.
   *
   * default === max: can only be tightened; tied to `alerts.max` as the upper
   * bound. With the `json` response format the effective row ceiling is 1000,
   * so this cap only fires when explicitly lowered below that.
   */
  maxGroupsPerExecution: schema.number({
    defaultValue: MAX_ALERTS_PER_RUN,
    min: 1,
    max: MAX_ALERTS_PER_RUN,
  }),
  timeout: schema.maybe(schema.string({ validate: validateDuration })),
  query: schema.object({
    /**
     * Maximum ES response body size for non-streaming rule queries. Each
     * execution transiently holds roughly 4× this value in heap; size this as
     * `heap budget / (capacity × 4)`. Defaults to 50mb; `config/serverless.yml`
     * lowers it to 10mb for Serverless.
     *
     * Applies to all non-streaming queries: recovery and data-presence queries
     * always use JSON regardless of the feature flag; the breach query uses JSON
     * only when `alertingV2.esqlResponseFormat` resolves to `json`.
     */
    maxResponseSize: schema.byteSize({
      defaultValue: DEFAULT_MAX_QUERY_RESPONSE_SIZE,
      min: MIN_MAX_QUERY_RESPONSE_SIZE,
      max: MAX_MAX_QUERY_RESPONSE_SIZE,
    }),
  }),
});

const rulesSchema = schema.object({
  /**
   * Smallest `schedule.every` a rule is allowed to use. Rules created, updated
   * or enabled with a shorter interval are rejected. Configurable between the
   * absolute rule-schedule minimum and 30d; defaults to 1m.
   */
  minimumScheduleInterval: schema.string({
    defaultValue: MINIMUM_SCHEDULE_INTERVAL_DEFAULT,
    validate: (duration: string): string | undefined => {
      const formatError = validateDuration(duration);
      if (formatError) {
        return formatError;
      }

      const durationMs = parseDurationToMs(duration);
      if (durationMs < parseDurationToMs(MINIMUM_SCHEDULE_INTERVAL_FLOOR)) {
        return `duration cannot be less than ${MINIMUM_SCHEDULE_INTERVAL_FLOOR}`;
      }
      if (durationMs > parseDurationToMs(MAX_MINIMUM_SCHEDULE_INTERVAL)) {
        return `duration cannot exceed ${MAX_MINIMUM_SCHEDULE_INTERVAL}`;
      }
    },
  }),
  /**
   * Combined rule runs per minute cap across all spaces. Creating enabled rules
   * or enabling existing rules that would exceed the limit is rejected; creating
   * disabled rules is always allowed.
   *
   * `0` is a freeze mode: creating enabled rules and enabling existing rules are
   * rejected while existing rules keep running. Defaults to 32000 (v1 hosted
   * budget); `config/serverless.yml` overrides to 400 for Serverless.
   */
  maxScheduledPerMinute: schema.number({ defaultValue: 32000, min: 0, max: 32000 }),
  run: rulesRunSchema,
});

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  invalidateApiKeysTask: schema.object({
    interval: schema.string({ defaultValue: '5m', validate: validateDuration }),
    removalDelay: schema.string({ defaultValue: '1h', validate: validateDuration }),
  }),
  rules: rulesSchema,
});

export type PluginConfig = TypeOf<typeof configSchema>;
export type RulesConfig = TypeOf<typeof rulesSchema>;

/**
 * Rows a single execution may request: the product-level `alerts.max` ceiling,
 * further capped by the active response format when that format declares a
 * limit of its own. The format is passed in rather than read from config
 * because it comes from the `alertingV2.esqlResponseFormat` feature flag, and
 * the caller must derive the query `LIMIT` from the same format the query
 * itself will use.
 */
export const getQueryRowLimit = (config: PluginConfig, format: EsqlResponseFormat): number => {
  const maxAlerts = config.rules.run.alerts.max;
  const { maxRows } = format;

  return maxRows === undefined ? maxAlerts : Math.min(maxAlerts, maxRows);
};
