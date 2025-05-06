/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { ScheduledReportApiJSON, ScheduledReportType } from '../../../../types';

export function transformRawScheduledReportToReport(
  rawScheduledReport: SavedObject<ScheduledReportType>
): ScheduledReportApiJSON {
  const parsedPayload = JSON.parse(rawScheduledReport.attributes.payload);
  return {
    id: rawScheduledReport.id,
    jobtype: rawScheduledReport.attributes.jobType,
    created_at: rawScheduledReport.attributes.createdAt,
    created_by: rawScheduledReport.attributes.createdBy as string | false,
    payload: parsedPayload,
    meta: rawScheduledReport.attributes.meta,
    migration_version: rawScheduledReport.attributes.migrationVersion,
    schedule: rawScheduledReport.attributes.schedule,
    notification: rawScheduledReport.attributes.notification,
  };
}
