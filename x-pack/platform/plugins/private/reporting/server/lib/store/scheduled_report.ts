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
import { RawScheduledReport } from '../../saved_objects/scheduled_report/schemas/latest';

interface ConstructorOpts {
  runAt: Date;
  kibanaId: string;
  kibanaName: string;
  queueTimeout: number;
  reportSO: SavedObject<RawScheduledReport>;
}

export class ScheduledReport extends Report {
  /*
   * Create a report from a scheduled report saved object
   */
  constructor(opts: ConstructorOpts) {
    const { kibanaId, kibanaName, runAt, reportSO, queueTimeout } = opts;
    const now = moment.utc();
    const startTime = now.toISOString();
    const expirationTime = now.add(queueTimeout).toISOString();

    let payload: BasePayload;
    try {
      payload = JSON.parse(reportSO.attributes.payload);
    } catch (e) {
      throw new Error(`Unable to parse payload from scheduled report saved object: ${e}`);
    }

    payload.forceNow = runAt.toISOString();
    payload.title = `${reportSO.attributes.title} [${runAt.toISOString()}]`;

    if (!reportSO.id) {
      throw new Error(`Invalid scheduled report saved object - no id`);
    }

    super(
      {
        migration_version: reportSO.attributes.migrationVersion,
        jobtype: reportSO.attributes.jobType,
        created_at: runAt.toISOString(),
        created_by: reportSO.attributes.createdBy as string | false,
        payload,
        meta: reportSO.attributes.meta,
        status: JOB_STATUS.PROCESSING,
        attempts: 1,
        process_expiration: expirationTime,
        kibana_id: kibanaId,
        kibana_name: kibanaName,
        max_attempts: 1,
        started_at: startTime,
        timeout: queueTimeout,
        scheduled_report_id: reportSO.id,
      },
      { queue_time_ms: [now.diff(moment.utc(runAt), 'milliseconds')] }
    );
  }
}
