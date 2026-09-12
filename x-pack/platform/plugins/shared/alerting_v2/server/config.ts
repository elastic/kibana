/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Type, TypeOf } from '@kbn/config-schema';
import { DEFAULT_MINIMUM_SCHEDULE_INTERVAL, MIN_SCHEDULE_INTERVAL } from '@kbn/alerting-v2-schemas';
import { parseDurationToMs, validateDuration } from './lib/duration';
import {
  DEFAULT_ESQL_RESPONSE_FORMAT,
  ESQL_RESPONSE_FORMAT_NAMES,
  getEsqlResponseFormat,
  type EsqlResponseFormatName,
} from './lib/services/query_service/formats';

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
/** Default cap on the ES response body size for non-streaming rule queries. */
const DEFAULT_MAX_QUERY_RESPONSE_SIZE = '50mb';
/** Anything smaller than this cannot hold a single ES|QL row with metadata. */
const MIN_MAX_QUERY_RESPONSE_SIZE = '1kb';

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
     * non-streaming rule queries: the breach query on the JSON response path,
     * plus the recovery and data-presence queries. Queries whose response
     * exceeds this limit are aborted and the execution fails as a user error
     * so the rule owner can narrow the query (KEEP / STATS) or raise the limit.
     *
     * Every execution transiently holds roughly 4x the response size in heap,
     * and Task Manager capacity decides how many run at once, so size this as
     * `heap budget / (capacity x 4)`. Accepts a byte-size string (`10mb`, `512kb`)
     * or a plain number of bytes. Defaults to 50mb; `config/serverless.yml`
     * lowers it to 10mb for the default Serverless background-tasks pod.
     */
    maxResponseSize: schema.byteSize({
      defaultValue: DEFAULT_MAX_QUERY_RESPONSE_SIZE,
      min: MIN_MAX_QUERY_RESPONSE_SIZE,
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
   *
   * The default matches the alerting v1 hosted budget (`xpack.alerting.rules.maxScheduledPerMinute`).
   * Serverless projects are capped at 400 via `config/serverless.yml`, mirroring v1.
   */
  maxScheduledPerMinute: schema.number({ defaultValue: 32000, min: 0, max: 32000 }),
  /** Per-execution guardrails applied while a rule runs. */
  run: rulesRunSchema,
});

const esqlSchema = schema.object({
  // `schema.oneOf` only declares fixed-arity tuple overloads, so the mapped
  // array is asserted into the single-branch one; the resulting type is the
  // full `EsqlResponseFormatName` union.
  responseFormat: schema.oneOf(
    ESQL_RESPONSE_FORMAT_NAMES.map((name) => schema.literal(name)) as [
      Type<EsqlResponseFormatName>
    ],
    { defaultValue: DEFAULT_ESQL_RESPONSE_FORMAT }
  ),
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

/**
 * Rows a single execution may request: the product-level `alerts.max` ceiling,
 * further capped by the configured response format when that format declares a
 * limit of its own.
 */
export const getQueryRowLimit = (config: PluginConfig): number => {
  const maxAlerts = config.rules.run.alerts.max;
  const { maxRows } = getEsqlResponseFormat(config.esql.responseFormat);

  return maxRows === undefined ? maxAlerts : Math.min(maxAlerts, maxRows);
};
