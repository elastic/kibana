/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/rrule';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { IntervalSchedule, RruleSchedule } from '@kbn/task-manager-plugin/server';
import type { AlertingServerStartDependencies } from '../../../types';
import type { RuleDoctorSettings } from '../../rule_doctor_settings';
import { getRuleDoctorTaskId, RULE_DOCTOR_TASK_TYPE, RULE_DOCTOR_DEFAULT_INTERVAL } from './task_definition';

const FREQ_STRING_TO_ENUM: Record<string, Frequency> = {
  YEARLY: Frequency.YEARLY,
  MONTHLY: Frequency.MONTHLY,
  WEEKLY: Frequency.WEEKLY,
  DAILY: Frequency.DAILY,
  HOURLY: Frequency.HOURLY,
};

export function settingsToSchedule(
  settings: RuleDoctorSettings
): IntervalSchedule | RruleSchedule {
  if (settings.scheduleType === 'rrule' && settings.rrule) {
    const freq = FREQ_STRING_TO_ENUM[settings.rrule.freq] ?? Frequency.DAILY;
    return {
      rrule: {
        freq,
        interval: settings.rrule.interval,
        tzid: settings.rrule.tzid,
        ...(settings.rrule.dtstart && { dtstart: settings.rrule.dtstart }),
        ...(settings.rrule.byhour?.length && { byhour: settings.rrule.byhour }),
        ...(settings.rrule.byminute?.length && { byminute: settings.rrule.byminute }),
        ...(settings.rrule.byweekday?.length && { byweekday: settings.rrule.byweekday }),
        ...(settings.rrule.bymonthday?.length && { bymonthday: settings.rrule.bymonthday }),
        ...(settings.rrule.bymonth?.length && { bymonth: settings.rrule.bymonth }),
      },
    };
  }

  return { interval: settings.interval ?? RULE_DOCTOR_DEFAULT_INTERVAL };
}

export async function scheduleRuleDoctorTask({
  logger,
  taskManager,
  schedule,
  spaceId,
  request,
}: {
  logger: Logger;
  taskManager: AlertingServerStartDependencies['taskManager'];
  schedule: IntervalSchedule | RruleSchedule;
  spaceId: string;
  request: KibanaRequest;
}): Promise<void> {
  const taskId = getRuleDoctorTaskId(spaceId);
  try {
    await taskManager.ensureScheduled(
      {
        id: taskId,
        taskType: RULE_DOCTOR_TASK_TYPE,
        schedule,
        state: {},
        params: { spaceId },
        scope: ['alerting'],
        enabled: true,
      },
      { request }
    );
  } catch (e) {
    logger.error(
      `Error scheduling ${taskId} task, received ${(e as Error).message}`
    );
  }
}
