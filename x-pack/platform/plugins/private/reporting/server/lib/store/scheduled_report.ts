/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { JOB_STATUS } from '@kbn/reporting-common';

import { SavedObject } from '@kbn/core/server';
import { BasePayload } from '@kbn/reporting-common/types';
import { Report } from './report';
import { ScheduledReportType } from '../../types';

interface ConstructorOpts {
  runAt: Date;
  kibanaId: string;
  kibanaName: string;
  queueTimeout: number;
  spaceId: string;
  scheduledReport: SavedObject<ScheduledReportType>;
}

export class ScheduledReport extends Report {
  /*
   * Create a report from a scheduled_report saved object
   */
  constructor(opts: ConstructorOpts) {
    const { kibanaId, kibanaName, runAt, scheduledReport, spaceId, queueTimeout } = opts;
    const now = moment.utc();
    const startTime = now.toISOString();
    const expirationTime = now.add(queueTimeout).toISOString();

    let payload: BasePayload;
    try {
      payload = JSON.parse(scheduledReport.attributes.payload);
    } catch (e) {
      throw new Error(`Unable to parse payload from scheduled_report saved object: ${e}`);
    }

    payload.forceNow = runAt.toISOString();
    payload.title = `${scheduledReport.attributes.title} [${runAt.toISOString()}]`;

    if (!scheduledReport.id) {
      throw new Error(`Invalid scheduled_report saved object - no id`);
    }

    super(
      {
        migration_version: scheduledReport.attributes.migrationVersion,
        jobtype: scheduledReport.attributes.jobType,
        created_at: runAt.toISOString(),
        created_by: scheduledReport.attributes.createdBy as string | false,
        payload,
        meta: scheduledReport.attributes.meta,
        status: JOB_STATUS.PROCESSING,
        attempts: 1,
        process_expiration: expirationTime,
        kibana_id: kibanaId,
        kibana_name: kibanaName,
        max_attempts: 1,
        started_at: startTime,
        timeout: queueTimeout,
        scheduled_report_id: scheduledReport.id,
        space_id: spaceId,
      },
      { queue_time_ms: [now.diff(moment.utc(runAt), 'milliseconds')] }
    );
  }
}
