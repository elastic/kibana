/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { ScheduledReportTaskParams } from '../../../../lib/tasks';
import { RawScheduledReport } from '../../../../saved_objects/scheduled_report/schemas/latest';

export function transformRawScheduledReportToTaskParams(
  rawScheduledReport: SavedObject<RawScheduledReport>
): ScheduledReportTaskParams {
  return {
    id: rawScheduledReport.id,
    jobtype: rawScheduledReport.attributes.jobType,
    schedule: rawScheduledReport.attributes.schedule,
  };
}
