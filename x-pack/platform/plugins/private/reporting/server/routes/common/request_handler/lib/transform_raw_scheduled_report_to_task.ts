/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { ScheduledReportType } from '../../../../types';
import { ScheduledReportTaskParamsWithoutSpaceId } from '../../../../lib/tasks';

export function transformRawScheduledReportToTaskParams(
  rawScheduledReport: SavedObject<ScheduledReportType>
): ScheduledReportTaskParamsWithoutSpaceId {
  return {
    id: rawScheduledReport.id,
    jobtype: rawScheduledReport.attributes.jobType,
    schedule: rawScheduledReport.attributes.schedule,
  };
}
