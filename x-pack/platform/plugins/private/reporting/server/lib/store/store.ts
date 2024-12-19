/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ILM_POLICY_NAME, JOB_STATUS } from '@kbn/reporting-common';
import type {
  ExecutionError,
  ReportDocument,
  ReportOutput,
  ReportSource,
} from '@kbn/reporting-common/types';
import {
  REPORTING_DATA_STREAM_ALIAS,
  REPORTING_DATA_STREAM_COMPONENT_TEMPLATE,
} from '@kbn/reporting-server';
import moment from 'moment';
import type { Report } from '.';
import { SavedReport } from '.';
import type { ReportingCore } from '../..';
import type { ReportTaskParams } from '../tasks';
import { IlmPolicyManager } from './ilm_policy_manager';
import { MIGRATION_VERSION } from './report';

type UpdateResponse<T> = estypes.UpdateResponse<T>;
type IndexResponse = estypes.IndexResponse;

/*
 * When an instance of Kibana claims a report job, this information tells us about that instance
 */
export type ReportProcessingFields = Required<{
  kibana_id: Report['kibana_id'];
  kibana_name: Report['kibana_name'];
  attempts: Report['attempts'];
  started_at: Report['started_at'];
  max_attempts: Report['max_attempts'];
  timeout: Report['timeout'];
  process_expiration: Report['process_expiration'];
}>;

export interface ReportFailedFields {
  output: ReportOutput | null;
  completed_at?: Report['completed_at'];
  error?: ExecutionError | unknown;
}

export type ReportCompletedFields = Required<{
  completed_at: Report['completed_at'];
  output: Omit<ReportOutput, 'content'> | null;
}>;

/*
 * When searching for long-pending reports, we get a subset of fields
 */
export interface ReportRecordTimeout {
  _id: string;
  _index: string;
  _source: {
    status: JOB_STATUS;
    process_expiration?: string;
  };
}

/*
 * When searching for long-pending reports, we get a subset of fields
 */
const sourceDoc = (doc: Partial<ReportSource>): Partial<ReportSource> => {
  return {
    ...doc,
    migration_version: MIGRATION_VERSION,
    '@timestamp': new Date(0).toISOString(), // required for data streams compatibility
  };
};

const esDocForUpdate = (
  report: SavedReport,
  doc: Partial<ReportSource>
): Parameters<ElasticsearchClient['update']>[0] => {
  return {
    id: report._id,
    index: report._index,
    if_seq_no: report._seq_no,
    if_primary_term: report._primary_term,
    refresh: 'wait_for' as estypes.Refresh,
    body: { doc },
  };
};

const jobDebugMessage = (report: Report) =>
  `${report._id} ` +
  `[_index: ${report._index}] ` +
  `[_seq_no: ${report._seq_no}]  ` +
  `[_primary_term: ${report._primary_term}]` +
  `[attempts: ${report.attempts}] ` +
  `[process_expiration: ${report.process_expiration}]`;

/*
 * A class to give an interface to historical reports in the reporting.index
 * - track the state: pending, processing, completed, etc
 * - handle updates and deletes to the reporting document
 * - interface for downloading the report
 */
export class ReportingStore {
  private client?: ElasticsearchClient;

  constructor(private reportingCore: ReportingCore, private logger: Logger) {
    this.logger = logger.get('store');
  }

  private async getClient() {
    if (!this.client) {
      ({ asInternalUser: this.client } = await this.reportingCore.getEsClient());
    }

    return this.client;
  }

  protected async createIlmPolicy() {
    const client = await this.getClient();
    const ilmPolicyManager = IlmPolicyManager.create({ client });
    if (await ilmPolicyManager.doesIlmPolicyExist()) {
      this.logger.debug(`Found ILM policy ${ILM_POLICY_NAME}; skipping creation.`);
    } else {
      this.logger.info(`Creating ILM policy for reporting data stream: ${ILM_POLICY_NAME}`);
      await ilmPolicyManager.createIlmPolicy();
    }

    this.logger.info(
      `Linking ILM policy to reporting data stream: ${REPORTING_DATA_STREAM_ALIAS}, component template: ${REPORTING_DATA_STREAM_COMPONENT_TEMPLATE}`
    );
    await ilmPolicyManager.linkIlmPolicy();
  }

  private async indexReport(report: Report): Promise<IndexResponse> {
    const doc = {
      index: REPORTING_DATA_STREAM_ALIAS,
      id: report._id,
      refresh: 'wait_for' as estypes.Refresh,
      op_type: 'create' as const,
      body: {
        ...report.toReportSource(),
        ...sourceDoc({
          process_expiration: new Date(0).toISOString(),
          attempts: 0,
          status: JOB_STATUS.PENDING,
        }),
      },
    };
    const client = await this.getClient();
    return await client.index(doc);
  }

  /**
   * Function to be called during plugin start phase. This ensures the environment is correctly
   * configured for storage of reports.
   */
  public async start() {
    const { statefulSettings } = this.reportingCore.getConfig();
    try {
      if (statefulSettings.enabled) {
        await this.createIlmPolicy();
      }
    } catch (e) {
      this.logger.error('Error in start phase');
      this.logger.error(e);
      throw e;
    }
  }

  public async addReport(report: Report): Promise<SavedReport> {
    try {
      report.updateWithEsDoc(await this.indexReport(report));
      return report as SavedReport;
    } catch (err) {
      this.reportingCore.getEventLogger(report).logError(err);
      this.logError(`Error in adding a report!`, err, report);
      throw err;
    }
  }

  /*
   * Search for a report from task data and return back the report
   */
  public async findReportFromTask(
    taskJson: Pick<ReportTaskParams, 'id' | 'index'>
  ): Promise<SavedReport> {
    if (!taskJson.index) {
      throw new Error('Task JSON is missing index field!');
    }
    if (!taskJson.id || !taskJson.index) {
      const notRetrievable = new Error(`Unable to retrieve pending report: Invalid report ID!`);
      this.logger.error(notRetrievable); // for stack trace
      throw notRetrievable;
    }

    try {
      const client = await this.getClient();
      const document = await client.get<ReportSource>({
        index: taskJson.index,
        id: taskJson.id,
      });

      return new SavedReport({
        _id: document._id,
        _index: document._index,
        _seq_no: document._seq_no,
        _primary_term: document._primary_term,
        jobtype: document._source?.jobtype,
        attempts: document._source?.attempts,
        created_at: document._source?.created_at,
        created_by: document._source?.created_by,
        max_attempts: document._source?.max_attempts,
        meta: document._source?.meta,
        metrics: document._source?.metrics,
        payload: document._source?.payload,
        error: document._source?.error,
        process_expiration: document._source?.process_expiration,
        status: document._source?.status,
        timeout: document._source?.timeout,
      });
    } catch (err) {
      this.logger.error(
        `Error in finding the report from the scheduled task info! ` +
          `[id: ${taskJson.id}] [index: ${taskJson.index}]`
      );
      this.logger.error(err);
      this.reportingCore.getEventLogger({ _id: taskJson.id }).logError(err);
      throw err;
    }
  }

  public async setReportClaimed(
    report: SavedReport,
    processingInfo: ReportProcessingFields
  ): Promise<UpdateResponse<ReportDocument>> {
    const doc = sourceDoc({
      ...processingInfo,
      status: JOB_STATUS.PROCESSING,
    });

    let body: UpdateResponse<ReportDocument>;
    try {
      const client = await this.getClient();
      body = await client.update<unknown, unknown, ReportDocument>(esDocForUpdate(report, doc));
    } catch (err) {
      this.logError(`Error in updating status to processing! Report: ${jobDebugMessage(report)}`, err, report); // prettier-ignore
      throw err;
    }

    // log the amount of time the report waited in "pending" status
    this.reportingCore.getEventLogger(report).logClaimTask({
      queueDurationMs: moment.utc().valueOf() - moment.utc(report.created_at).valueOf(),
    });

    return body;
  }

  private logError(message: string, err: Error, report: Report) {
    this.logger.error(message);
    this.logger.error(err);
    this.reportingCore.getEventLogger(report).logError(err);
  }

  public async setReportFailed(
    report: SavedReport,
    failedInfo: ReportFailedFields
  ): Promise<UpdateResponse<ReportDocument>> {
    const doc = sourceDoc({
      ...failedInfo,
      status: JOB_STATUS.FAILED,
    });

    let body: UpdateResponse<ReportDocument>;
    try {
      const client = await this.getClient();
      body = await client.update<unknown, unknown, ReportDocument>(esDocForUpdate(report, doc));
    } catch (err) {
      this.logError(`Error in updating status to failed! Report: ${jobDebugMessage(report)}`, err, report); // prettier-ignore
      throw err;
    }

    this.reportingCore.getEventLogger(report).logReportFailure();

    return body;
  }

  public async setReportError(
    report: SavedReport,
    errorInfo: Pick<ReportFailedFields, 'error' | 'output'>
  ): Promise<UpdateResponse<ReportDocument>> {
    const doc = sourceDoc({
      ...errorInfo,
    });

    let body: UpdateResponse<ReportDocument>;
    try {
      const client = await this.getClient();
      body = await client.update<unknown, unknown, ReportDocument>(esDocForUpdate(report, doc));
    } catch (err) {
      this.logError(`Error in updating status to failed! Report: ${jobDebugMessage(report)}`, err, report); // prettier-ignore
      throw err;
    }

    this.reportingCore.getEventLogger(report).logReportFailure();

    return body;
  }

  public async setReportCompleted(
    report: SavedReport,
    completedInfo: ReportCompletedFields
  ): Promise<UpdateResponse<ReportDocument>> {
    const { output } = completedInfo;
    const status =
      output && output.warnings && output.warnings.length > 0
        ? JOB_STATUS.WARNINGS
        : JOB_STATUS.COMPLETED;
    const doc = sourceDoc({
      ...completedInfo,
      status,
    } as ReportSource);

    let body: UpdateResponse<ReportDocument>;
    try {
      const client = await this.getClient();
      body = await client.update<unknown, unknown, ReportDocument>(esDocForUpdate(report, doc));
    } catch (err) {
      this.logError(`Error in updating status to complete! Report: ${jobDebugMessage(report)}`, err, report); // prettier-ignore
      throw err;
    }

    this.reportingCore.getEventLogger(report).logReportSaved();

    return body;
  }
}
