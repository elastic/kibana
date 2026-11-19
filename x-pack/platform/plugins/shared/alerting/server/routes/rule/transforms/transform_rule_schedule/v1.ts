/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Schedule } from '@kbn/response-ops-scheduling-types';
import { isRruleSchedule } from '@kbn/response-ops-scheduling-types';
import {
  transformRruleStringToRruleV1,
  transformRruleToRruleStringV1,
} from '@kbn/response-ops-schedule-schema';
import type {
  RuleScheduleRequestV1,
  RuleScheduleResponseV1,
} from '../../../../../common/routes/rule/common';

/**
 * Transforms a request schedule into a rules client schedule, parsing rrule strings into objects.
 */
export const transformRuleScheduleRequest = (schedule: RuleScheduleRequestV1): Schedule =>
  'rrule' in schedule
    ? { rrule: transformRruleStringToRruleV1(schedule.rrule) }
    : { interval: schedule.interval };

/**
 * Transforms a rules client schedule into a response schedule, serializing rrule objects into strings.
 */
export const transformRuleScheduleResponse = (schedule: Schedule): RuleScheduleResponseV1 =>
  isRruleSchedule(schedule)
    ? { rrule: transformRruleToRruleStringV1(schedule.rrule) }
    : { interval: schedule.interval };
