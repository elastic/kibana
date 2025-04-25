/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { ScheduledReportApiJSON } from '@kbn/reporting-common/types';
import { RawScheduledReport } from '../../../../saved_objects/scheduled_report/schemas/latest';

export function transformRawScheduledReportToReport(
  rawScheduledReport: SavedObject<RawScheduledReport>
): ScheduledReportApiJSON {
  const base64Payload = rawScheduledReport.attributes.payload;
  const decodedPayload = Buffer.from(base64Payload, 'base64').toString();
  const parsedPayload = JSON.parse(decodedPayload);
  return {
    id: rawScheduledReport.id,
    jobtype: rawScheduledReport.attributes.jobType,
    created_at: rawScheduledReport.attributes.createdAt,
    created_by: rawScheduledReport.attributes.createdBy as string | false,
    payload: parsedPayload,
    meta: rawScheduledReport.attributes.meta,
    migration_version: rawScheduledReport.attributes.migrationVersion,
    schedule: rawScheduledReport.attributes.schedule,
  };
}
