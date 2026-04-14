/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export interface ExecutionLogRow {
  '@timestamp': string;
  'kibana.task.scheduled': string;
  duration_ms: number;
  'event.outcome': string;
  display_message: string;
  active_alerts: number | null;
}

export interface ExecutionKpiRow {
  succeeded: number;
  failed: number;
}

export interface ExecutionBreakdownRow {
  bucket: string;
  succeeded: number;
  failed: number;
}
