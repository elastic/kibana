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

/** Default value of `xpack.alerting_v2.rules.minimumScheduleInterval`. */
const MINIMUM_SCHEDULE_INTERVAL_DEFAULT = DEFAULT_MINIMUM_SCHEDULE_INTERVAL;
/**
 * Lowest value `xpack.alerting_v2.rules.minimumScheduleInterval` may be set to.
 * Tied to the absolute minimum a rule `schedule.every` can be, so functional
 * tests can relax the guardrail and run rules every few seconds. The default
 * remains 1m, so production deployments keep the 1m minimum unless an operator
 * deliberately lowers it.
 */
const MINIMUM_SCHEDULE_INTERVAL_FLOOR = MIN_SCHEDULE_INTERVAL;
/** Highest value `xpack.alerting_v2.rules.minimumScheduleInterval` may be set to. */
const MAX_MINIMUM_SCHEDULE_INTERVAL = '30d';

/** Default and highest value of `xpack.alerting_v2.rules.run.alerts.max`. */
const MAX_ALERTS_PER_RUN = 10000;
/** Default cap on the ES response body size for non-streaming rule queries (50 MB). */
const DEFAULT_MAX_QUERY_RESPONSE_SIZE_BYTES = 50 * 1024 * 1024;
/**
 * Max for the non-streaming (JSON) ES|QL path.
 */
export const NON_STREAMING_MAX_ROWS = 1000;

const rulesRunSchema = schema.object({
  alerts: schema.object({
    max: schema.number({ defaultValue: MAX_ALERTS_PER_RUN, min: 1, max: MAX_ALERTS_PER_RUN }),
  }),
  /** Distinct groups per run can never exceed rows per run, so the ceiling is tied to `alerts.max`. */
  maxGroupsPerExecution: schema.number({
    defaultValue: MAX_ALERTS_PER_RUN,
    min: 1,
    max: MAX_ALERTS_PER_RUN,
  }),
  timeout: schema.maybe(schema.string({ validate: validateDuration })),
  query: schema.object({
    /**
     * Maximum allowed Elasticsearch response body size (in bytes) for
     * non-streaming rule queries (recovery, data-presence). Queries whose
     * response exceeds this limit are aborted and the execution is attributed
     * to the rule owner so they can narrow the query or raise the limit.
     * Defaults to 50 MB.
     */
    maxResponseSize: schema.number({
      defaultValue: DEFAULT_MAX_QUERY_RESPONSE_SIZE_BYTES,
      min: 1024,
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
   * Upper bound on the combined number of rule runs per minute across all
   * spaces. Creating, updating or enabling a rule that would push the total
   * past this limit is rejected.
   */
  maxScheduledPerMinute: schema.number({ defaultValue: 400, min: 0, max: 32000 }),
  /** Per-execution guardrails applied while a rule runs. */
  run: rulesRunSchema,
});

const esqlSchema = schema.object({
  responseFormat: schema.oneOf([schema.literal('json'), schema.literal('arrow')], {
    defaultValue: 'json',
  }),
});

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  invalidateApiKeysTask: schema.object({
    interval: schema.string({ defaultValue: '5m', validate: validateDuration }),
    removalDelay: schema.string({ defaultValue: '1h', validate: validateDuration }),
  }),
  rules: rulesSchema,
  esql: esqlSchema,
});

export type PluginConfig = TypeOf<typeof configSchema>;
export type RulesConfig = TypeOf<typeof rulesSchema>;
export type EsqlConfig = TypeOf<typeof esqlSchema>;

export const getQueryRowLimit = (config: PluginConfig): number => {
  const maxAlerts = config.rules.run.alerts.max;
  if (config.esql.responseFormat === 'json') {
    return Math.min(maxAlerts, NON_STREAMING_MAX_ROWS);
  }
  return maxAlerts;
};
