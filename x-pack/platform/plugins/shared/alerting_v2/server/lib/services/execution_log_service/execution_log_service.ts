/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { ServiceIdentifier } from 'inversify';
import type { QueryServiceContract } from '../query_service/query_service';
import { QueryServiceInternalToken } from '../query_service/tokens';
import { EVENT_LOG_PROVIDER, EVENT_LOG_ACTIONS } from '../execution_event_logger';

const EVENT_LOG_INDEX = '.kibana-event-log-*';
const NS_TO_MS = 1_000_000;
const EXECUTION_LOG_LIMIT = 100;

export interface ExecutionLogEntry {
  readonly timestamp: string;
  readonly scheduledAt: string;
  readonly durationMs: number;
  readonly outcome: string;
  readonly message: string;
  readonly activeAlerts: number;
}

export interface GetExecutionLogParams {
  readonly ruleId: string;
  readonly dateStart: string;
  readonly dateEnd: string;
  readonly sort: 'asc' | 'desc';
  readonly statusFilter?: string;
  readonly search?: string;
}

export interface ExecutionKpiResponse {
  readonly succeeded: number;
  readonly failed: number;
}

export interface GetExecutionKpiParams {
  readonly ruleId: string;
  readonly dateStart: string;
  readonly dateEnd: string;
}

export interface ExecutionBreakdownBucket {
  readonly bucket: string;
  readonly succeeded: number;
  readonly failed: number;
}

export interface GetExecutionBreakdownParams {
  readonly ruleId: string;
  readonly dateStart: string;
  readonly dateEnd: string;
  readonly bucketInterval: string;
}

export interface ExecutionLogServiceContract {
  getExecutionLog(params: GetExecutionLogParams): Promise<ExecutionLogEntry[]>;
  getExecutionKpi(params: GetExecutionKpiParams): Promise<ExecutionKpiResponse>;
  getExecutionBreakdown(params: GetExecutionBreakdownParams): Promise<ExecutionBreakdownBucket[]>;
}

export const ExecutionLogServiceToken = Symbol.for(
  'alerting_v2.ExecutionLogService'
) as ServiceIdentifier<ExecutionLogServiceContract>;

interface ExecutionLogRow {
  '@timestamp': string;
  'kibana.task.scheduled': string;
  duration_ms: number;
  'event.outcome': string;
  display_message: string;
  active_alerts: number | null;
}

interface ExecutionKpiRow {
  count: number;
  'event.outcome': string;
}

interface ExecutionBreakdownRow {
  count: number;
  'event.outcome': string;
  bucket: string;
}

@injectable()
export class ExecutionLogService implements ExecutionLogServiceContract {
  constructor(
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract
  ) {}

  public async getExecutionLog(params: GetExecutionLogParams): Promise<ExecutionLogEntry[]> {
    const { ruleId, dateStart, dateEnd, sort, statusFilter, search } = params;
    const sortDir = sort.toUpperCase();

    let statusClause = '';
    if (statusFilter) {
      statusClause = `AND event.outcome == "${statusFilter}"`;
    }

    let searchClause = '';
    if (search) {
      searchClause = `AND message LIKE "*${search}*"`;
    }

    const query = `FROM ${EVENT_LOG_INDEX}
      | WHERE event.provider == "${EVENT_LOG_PROVIDER}"
        AND event.action == "${EVENT_LOG_ACTIONS.execute}"
        AND kibana.alerting.instance_id == ?
        AND @timestamp >= ?
        AND @timestamp <= ?
        ${statusClause}
        ${searchClause}
      | EVAL duration_ms = event.duration / ${NS_TO_MS},
             display_message = COALESCE(error.message, message),
             active_alerts = kibana.alert.rule.execution.metrics.alert_counts.active
      | KEEP @timestamp, kibana.task.scheduled, duration_ms, event.outcome, display_message, active_alerts
      | SORT @timestamp ${sortDir}
      | LIMIT ${EXECUTION_LOG_LIMIT}`;

    const rows = await this.queryService.executeQueryRows<ExecutionLogRow>({
      query,
      params: [ruleId, dateStart, dateEnd],
    });

    return rows.map((row) => ({
      timestamp: row['@timestamp'],
      scheduledAt: row['kibana.task.scheduled'],
      durationMs: Math.round(row.duration_ms),
      outcome: row['event.outcome'],
      message: row.display_message,
      activeAlerts: row.active_alerts ?? 0,
    }));
  }

  public async getExecutionKpi(params: GetExecutionKpiParams): Promise<ExecutionKpiResponse> {
    const { ruleId, dateStart, dateEnd } = params;

    const query = `FROM ${EVENT_LOG_INDEX}
      | WHERE event.provider == "${EVENT_LOG_PROVIDER}"
        AND event.action == "${EVENT_LOG_ACTIONS.execute}"
        AND kibana.alerting.instance_id == ?
        AND @timestamp >= ?
        AND @timestamp <= ?
      | STATS count = COUNT(*) BY event.outcome`;

    const rows = await this.queryService.executeQueryRows<ExecutionKpiRow>({
      query,
      params: [ruleId, dateStart, dateEnd],
    });

    let succeeded = 0;
    let failed = 0;

    for (const row of rows) {
      if (row['event.outcome'] === 'success') {
        succeeded = row.count;
      } else if (row['event.outcome'] === 'failure') {
        failed = row.count;
      }
    }

    return { succeeded, failed };
  }

  public async getExecutionBreakdown(
    params: GetExecutionBreakdownParams
  ): Promise<ExecutionBreakdownBucket[]> {
    const { ruleId, dateStart, dateEnd, bucketInterval } = params;

    const query = `FROM ${EVENT_LOG_INDEX}
      | WHERE event.provider == "${EVENT_LOG_PROVIDER}"
        AND event.action == "${EVENT_LOG_ACTIONS.execute}"
        AND kibana.alerting.instance_id == ?
        AND @timestamp >= ?
        AND @timestamp <= ?
      | STATS count = COUNT(*) BY event.outcome, bucket = BUCKET(@timestamp, ?)
      | SORT bucket ASC`;

    const rows = await this.queryService.executeQueryRows<ExecutionBreakdownRow>({
      query,
      params: [ruleId, dateStart, dateEnd, bucketInterval],
    });

    const bucketMap = new Map<string, { bucket: string; succeeded: number; failed: number }>();

    for (const row of rows) {
      const existing = bucketMap.get(row.bucket) ?? { bucket: row.bucket, succeeded: 0, failed: 0 };

      if (row['event.outcome'] === 'success') {
        existing.succeeded = row.count;
      } else if (row['event.outcome'] === 'failure') {
        existing.failed = row.count;
      }

      bucketMap.set(row.bucket, existing);
    }

    return Array.from(bucketMap.values());
  }
}
