/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  scheduleRequestSchema,
  scheduleResponseSchema,
  getScheduleRequestSchema,
  getScheduleResponseSchema,
} from './schema/latest';
export { transformCustomScheduleToRRule } from './transforms/custom_to_rrule/latest';
export { transformRRuleToCustomSchedule } from './transforms/rrule_to_custom/latest';
export type { ScheduleRequest, ScheduleResponse } from './types/latest';

export {
  scheduleRequestSchema as scheduleRequestSchemaV1,
  scheduleResponseSchema as scheduleResponseSchemaV1,
  getScheduleRequestSchema as getScheduleRequestSchemaV1,
  getScheduleResponseSchema as getScheduleResponseSchemaV1,
} from './schema/v1';
export { transformCustomScheduleToRRule as transformCustomScheduleToRRuleV1 } from './transforms/custom_to_rrule/v1';
export { transformRRuleToCustomSchedule as transformRRuleToCustomScheduleV1 } from './transforms/rrule_to_custom/v1';
export type { ScheduleRequest as ScheduleRequestV1 } from './types/v1';

export { getDurationInMilliseconds } from './transforms/custom_to_rrule/util';

export {
  ISO_DATE_REGEX,
  WEEKDAY_REGEX,
  DURATION_REGEX,
  INTERVAL_FREQUENCY_REGEXP,
  DEFAULT_TIMEZONE,
} from './constants';
