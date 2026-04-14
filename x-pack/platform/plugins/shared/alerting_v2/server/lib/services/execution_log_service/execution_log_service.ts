/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { QueryServiceContract } from '../query_service/query_service';
import { QueryServiceInternalToken } from '../query_service/tokens';
import type {
  ExecutionLogServiceContract,
  ExecutionLogEntry,
  GetExecutionLogParams,
  ExecutionKpiResponse,
  GetExecutionKpiParams,
  ExecutionBreakdownBucket,
  GetExecutionBreakdownParams,
  ExecutionLogRow,
  ExecutionKpiRow,
  ExecutionBreakdownRow,
} from './types';
import { getExecutionLogQuery, getExecutionKpiQuery, getExecutionBreakdownQuery } from './queries';

@injectable()
export class ExecutionLogService implements ExecutionLogServiceContract {
  constructor(
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract
  ) {}

  public async getExecutionLog(params: GetExecutionLogParams): Promise<ExecutionLogEntry[]> {
    const request = getExecutionLogQuery(params).toRequest();
    const rows = await this.queryService.executeQueryRows<ExecutionLogRow>({
      query: request.query,
      // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
      params: request.params,
      // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
      filter: request.filter,
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
    const request = getExecutionKpiQuery(params).toRequest();
    const rows = await this.queryService.executeQueryRows<ExecutionKpiRow>({
      query: request.query,
      // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
      params: request.params,
      // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
      filter: request.filter,
    });

    return {
      succeeded: rows[0]?.succeeded ?? 0,
      failed: rows[0]?.failed ?? 0,
    };
  }

  public async getExecutionBreakdown(
    params: GetExecutionBreakdownParams
  ): Promise<ExecutionBreakdownBucket[]> {
    const request = getExecutionBreakdownQuery(params).toRequest();
    const rows = await this.queryService.executeQueryRows<ExecutionBreakdownRow>({
      query: request.query,
      // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
      params: request.params,
      // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
      filter: request.filter,
    });

    return rows.map((row) => ({
      bucket: row.bucket,
      succeeded: row.succeeded ?? 0,
      failed: row.failed ?? 0,
    }));
  }
}
