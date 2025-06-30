/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import type { RruleSchedule } from '@kbn/task-manager-plugin/server';
import type { RawNotification } from '../../../server/saved_objects/scheduled_report/schemas/latest';
import type { ScheduledReportingJobResponse } from '../../../server/types';

export interface ScheduleReportRequestParams {
  reportTypeId: string;
  jobParams: string;
  schedule?: RruleSchedule;
  notification?: RawNotification;
}

export const scheduleReport = ({
  http,
  params: { reportTypeId, ...params },
}: {
  http: HttpSetup;
  params: ScheduleReportRequestParams;
}) => {
  return http.post<ScheduledReportingJobResponse>(
    `${INTERNAL_ROUTES.SCHEDULE_PREFIX}/${reportTypeId}`,
    {
      body: JSON.stringify(params),
    }
  );
};
