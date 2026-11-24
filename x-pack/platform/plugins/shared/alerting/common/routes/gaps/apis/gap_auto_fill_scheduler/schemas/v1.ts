/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import path from 'path';
import { schema } from '@kbn/config-schema';
import dateMath from '@kbn/datemath';
import {
  MAX_SCHEDULE_BACKFILL_LOOKBACK_WINDOW_DAYS,
  gapAutoFillSchedulerLimits,
  MAX_ID_LENGTH,
  MAX_NAME_LENGTH,
  MAX_ARRAY_FIELDS,
  MAX_FIELD_NAME_LENGTH,
  MAX_DURATION_STRING_LENGTH,
  ISO_DATE_MAX_LENGTH,
} from '../../../../../constants';
import { parseDuration } from '../../../../../parse_duration';
import { gapReasonType } from '../../../../../constants/gap_reason';
import { gapReasonTypeSchema } from '../../../../../schemas';

const { maxBackfills, numRetries, minScheduleIntervalInMs } = gapAutoFillSchedulerLimits;

export const createGapAutoFillSchedulerExamples = () =>
  path.join(__dirname, 'examples_create_gap_auto_fill_scheduler.yaml');
export const getGapAutoFillSchedulerExamples = () =>
  path.join(__dirname, 'examples_get_gap_auto_fill_scheduler.yaml');
export const updateGapAutoFillSchedulerExamples = () =>
  path.join(__dirname, 'examples_update_gap_auto_fill_scheduler.yaml');

const schedulerFieldDescriptions = {
  id: 'The identifier for the gap auto fill scheduler.',
  name: 'A name for the gap auto fill scheduler.',
  enabled:
    'Indicates whether the scheduler is enabled. When `true`, the scheduler periodically fills detected gaps for the matching rules; when `false`, no automatic gap filling occurs.',
  maxBackfills: 'The maximum number of backfills the scheduler creates per run.',
  numRetries: 'The number of times the scheduler retries filling a gap that failed.',
  gapFillRange:
    'How far back in time the scheduler looks for gaps, as a date math expression relative to now, for example `now-90d`.',
  scheduleInterval:
    'How often the scheduler runs, as a duration string such as `2m` or `1h`. The minimum interval is one minute.',
  scope: 'The scopes of the scheduler task, for example `security_solution`.',
  ruleTypes: 'The rule type and consumer pairs that the scheduler fills gaps for.',
  ruleType: 'The rule type identifier, for example `siem.queryRule`.',
  ruleConsumer: 'The consumer of the rule type, for example `siem`.',
  excludedReasons:
    'The gap reasons that the scheduler skips. Gaps caused by a rule being disabled are excluded by default.',
  createdBy: 'The identifier for the user that created the scheduler.',
  updatedBy: 'The identifier for the user that last updated the scheduler.',
  createdAt: 'The date and time that the scheduler was created.',
  updatedAt: 'The date and time that the scheduler was last updated.',
};

const validateGapAutoFillSchedulerPayload = (
  gapFillRange: string,
  schedule: { interval: string },
  ruleTypes: { type: string; consumer: string }[]
) => {
  const now = new Date();
  const parsed = dateMath.parse(gapFillRange, { forceNow: now });
  if (!parsed || !parsed.isValid()) {
    return 'gap_fill_range is invalid';
  }

  const maxLookbackExpression = `now-${MAX_SCHEDULE_BACKFILL_LOOKBACK_WINDOW_DAYS}d`;
  const lookbackLimit = dateMath.parse(maxLookbackExpression, { forceNow: now });
  if (!lookbackLimit || !lookbackLimit.isValid()) {
    return 'gap_fill_range is invalid';
  }

  if (parsed.isBefore(lookbackLimit)) {
    return `gap_fill_range cannot look back more than ${MAX_SCHEDULE_BACKFILL_LOOKBACK_WINDOW_DAYS} days`;
  }

  try {
    const intervalMs = parseDuration(schedule.interval);
    if (intervalMs < minScheduleIntervalInMs) {
      return 'schedule.interval must be at least 1 minute';
    }
  } catch (error) {
    return `schedule.interval is invalid: ${(error as Error).message}`;
  }

  // Duplicate check for rule_types
  const seen = new Set<string>();
  for (const ruleType of ruleTypes) {
    const key = `${ruleType.type}:${ruleType.consumer}`;
    if (seen.has(key)) {
      return `rule_types contains duplicate entry: type="${ruleType.type}" consumer="${ruleType.consumer}"`;
    }
    seen.add(key);
  }
};

export const getGapAutoFillSchedulerParamsSchema = schema.object({
  id: schema.string({
    maxLength: MAX_ID_LENGTH,
    meta: { description: schedulerFieldDescriptions.id },
  }),
});

const ruleTypesSchema = schema.arrayOf(
  schema.object({
    type: schema.string({
      maxLength: MAX_FIELD_NAME_LENGTH,
      meta: { description: schedulerFieldDescriptions.ruleType },
    }),
    consumer: schema.string({
      maxLength: MAX_NAME_LENGTH,
      meta: { description: schedulerFieldDescriptions.ruleConsumer },
    }),
  }),
  { maxSize: MAX_ARRAY_FIELDS, meta: { description: schedulerFieldDescriptions.ruleTypes } }
);

const scopeSchema = schema.arrayOf(schema.string({ maxLength: MAX_ID_LENGTH }), {
  maxSize: MAX_ARRAY_FIELDS,
  meta: { description: schedulerFieldDescriptions.scope },
});

const scheduleSchema = schema.object({
  interval: schema.string({
    maxLength: MAX_DURATION_STRING_LENGTH,
    meta: { description: schedulerFieldDescriptions.scheduleInterval },
  }),
});

const excludedReasonsSchema = schema.maybe(
  schema.arrayOf(gapReasonTypeSchema, {
    maxSize: Object.values(gapReasonType).length,
    meta: { description: schedulerFieldDescriptions.excludedReasons },
  })
);

export const gapAutoFillSchedulerBodySchema = schema.object(
  {
    id: schema.maybe(
      schema.string({
        maxLength: MAX_ID_LENGTH,
        meta: {
          description: `${schedulerFieldDescriptions.id} If omitted, a random identifier is generated.`,
        },
      })
    ),
    name: schema.string({
      defaultValue: '',
      maxLength: MAX_NAME_LENGTH,
      meta: { description: schedulerFieldDescriptions.name },
    }),
    enabled: schema.boolean({
      defaultValue: true,
      meta: { description: schedulerFieldDescriptions.enabled },
    }),
    max_backfills: schema.number({
      ...maxBackfills,
      meta: { description: schedulerFieldDescriptions.maxBackfills },
    }),
    num_retries: schema.number({
      ...numRetries,
      meta: { description: schedulerFieldDescriptions.numRetries },
    }),
    gap_fill_range: schema.string({
      defaultValue: 'now-90d',
      maxLength: MAX_DURATION_STRING_LENGTH,
      meta: { description: schedulerFieldDescriptions.gapFillRange },
    }),
    schedule: scheduleSchema,
    scope: scopeSchema,
    rule_types: ruleTypesSchema,
    excluded_reasons: excludedReasonsSchema,
  },
  {
    validate(payload) {
      return validateGapAutoFillSchedulerPayload(
        payload.gap_fill_range,
        payload.schedule,
        payload.rule_types
      );
    },
  }
);

export const gapAutoFillSchedulerUpdateBodySchema = schema.object(
  {
    name: schema.string({
      maxLength: MAX_NAME_LENGTH,
      meta: { description: schedulerFieldDescriptions.name },
    }),
    enabled: schema.boolean({ meta: { description: schedulerFieldDescriptions.enabled } }),
    gap_fill_range: schema.string({
      maxLength: MAX_DURATION_STRING_LENGTH,
      meta: { description: schedulerFieldDescriptions.gapFillRange },
    }),
    max_backfills: schema.number({
      ...maxBackfills,
      meta: { description: schedulerFieldDescriptions.maxBackfills },
    }),
    num_retries: schema.number({
      ...numRetries,
      meta: { description: schedulerFieldDescriptions.numRetries },
    }),
    schedule: scheduleSchema,
    scope: scopeSchema,
    rule_types: ruleTypesSchema,
    excluded_reasons: excludedReasonsSchema,
  },
  {
    validate(payload) {
      return validateGapAutoFillSchedulerPayload(
        payload.gap_fill_range,
        payload.schedule,
        payload.rule_types
      );
    },
  }
);

export const gapAutoFillSchedulerResponseSchema = schema.object(
  {
    id: schema.string({ meta: { description: schedulerFieldDescriptions.id } }),
    name: schema.string({ meta: { description: schedulerFieldDescriptions.name } }),
    enabled: schema.boolean({ meta: { description: schedulerFieldDescriptions.enabled } }),
    schedule: schema.object({
      interval: schema.string({
        meta: { description: schedulerFieldDescriptions.scheduleInterval },
      }),
    }),
    rule_types: schema.arrayOf(
      schema.object({
        type: schema.string({ meta: { description: schedulerFieldDescriptions.ruleType } }),
        consumer: schema.string({
          meta: { description: schedulerFieldDescriptions.ruleConsumer },
        }),
      }),
      { meta: { description: schedulerFieldDescriptions.ruleTypes } }
    ),
    gap_fill_range: schema.string({
      meta: { description: schedulerFieldDescriptions.gapFillRange },
    }),
    max_backfills: schema.number({
      meta: { description: schedulerFieldDescriptions.maxBackfills },
    }),
    num_retries: schema.number({ meta: { description: schedulerFieldDescriptions.numRetries } }),
    scope: schema.arrayOf(schema.string(), {
      meta: { description: schedulerFieldDescriptions.scope },
    }),
    excluded_reasons: schema.maybe(
      schema.arrayOf(schema.string(), {
        meta: { description: schedulerFieldDescriptions.excludedReasons },
      })
    ),
    created_by: schema.nullable(
      schema.string({ meta: { description: schedulerFieldDescriptions.createdBy } })
    ),
    updated_by: schema.nullable(
      schema.string({ meta: { description: schedulerFieldDescriptions.updatedBy } })
    ),
    created_at: schema.string({ meta: { description: schedulerFieldDescriptions.createdAt } }),
    updated_at: schema.string({ meta: { description: schedulerFieldDescriptions.updatedAt } }),
  },
  { meta: { id: 'gap_auto_fill_scheduler_response' } }
);

export const gapAutoFillSchedulerLogsRequestQuerySchema = schema.object(
  {
    start: schema.string({ maxLength: ISO_DATE_MAX_LENGTH }),
    end: schema.string({ maxLength: ISO_DATE_MAX_LENGTH }),
    page: schema.number({ defaultValue: 1, min: 1 }),
    per_page: schema.number({ defaultValue: 50, min: 1, max: 1000 }),
    sort_field: schema.oneOf([schema.literal('@timestamp')], { defaultValue: '@timestamp' }),
    sort_direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
      defaultValue: 'desc',
    }),
    statuses: schema.maybe(
      schema.arrayOf(
        schema.oneOf([
          schema.literal('success'),
          schema.literal('error'),
          schema.literal('skipped'),
          schema.literal('no_gaps'),
        ]),
        { maxSize: 4 }
      )
    ),
  },
  {
    validate({ start, end }) {
      const parsedStart = Date.parse(start);
      if (isNaN(parsedStart)) {
        return `[start]: query start must be valid date`;
      }

      const parsedEnd = Date.parse(end);
      if (isNaN(parsedEnd)) {
        return `[end]: query end must be valid date`;
      }
    },
  }
);

export const gapAutoFillSchedulerLogEntrySchema = schema.object({
  id: schema.string(),
  timestamp: schema.maybe(schema.string()),
  status: schema.maybe(schema.string()),
  message: schema.maybe(schema.string()),
  results: schema.maybe(
    schema.arrayOf(
      schema.object({
        rule_id: schema.maybe(schema.string()),
        processed_gaps: schema.maybe(schema.number()),
        status: schema.maybe(schema.string()),
        error: schema.maybe(schema.string()),
      })
    )
  ),
});

export const gapAutoFillSchedulerLogsResponseSchema = schema.object({
  data: schema.arrayOf(gapAutoFillSchedulerLogEntrySchema),
  total: schema.number(),
  page: schema.number(),
  per_page: schema.number(),
});

export const findGapAutoFillSchedulerLogsParamsSchema = schema.object({
  id: schema.string({ maxLength: MAX_ID_LENGTH }),
});
