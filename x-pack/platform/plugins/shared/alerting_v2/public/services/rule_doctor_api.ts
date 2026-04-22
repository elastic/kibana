/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { HttpStart } from '@kbn/core/public';
import { CoreStart } from '@kbn/core-di-browser';

export interface FindingDoc {
  '@timestamp': string;
  finding_id: string;
  execution_id: string;
  status: string;
  type: string;
  action: string;
  impact: 'low' | 'medium' | 'high';
  confidence: 'low' | 'medium' | 'high';
  summary: string;
  explanation: string;
  rule_ids?: string[];
  details?: Record<string, unknown>;
  current?: Record<string, unknown> | null;
  proposed?: Record<string, unknown> | null;
  diffs?: Array<{ field: string; previous: unknown; proposed: unknown }>;
}

export interface ListFindingsResponse {
  findings: FindingDoc[];
}

export type FindingStatus = 'open' | 'applied' | 'dismissed';

export interface ExecutionSummary {
  id: string;
  workflowId: string;
  insightType: string;
  insightLabel: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  dataViewName: string | null;
  dataViewId: string | null;
}

export interface ListExecutionsResponse {
  executions: ExecutionSummary[];
}

@injectable()
export class RuleDoctorApi {
  constructor(@inject(CoreStart('http')) private readonly http: HttpStart) {}

  public async getFinding(findingId: string): Promise<FindingDoc> {
    const response = await this.http.get<{ finding: FindingDoc }>(
      `/internal/alerting/v2/rule_doctor/findings/${encodeURIComponent(findingId)}`
    );
    return response.finding;
  }

  public async listFindings(status: FindingStatus = 'open'): Promise<ListFindingsResponse> {
    return this.http.get<ListFindingsResponse>(
      '/internal/alerting/v2/rule_doctor/findings',
      { query: { status } }
    );
  }

  public async updateFindingStatus(
    findingId: string,
    status: 'applied' | 'dismissed'
  ): Promise<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(
      `/internal/alerting/v2/rule_doctor/findings/${encodeURIComponent(findingId)}/status`,
      { body: JSON.stringify({ status }) }
    );
  }

  public async runAnalysis(): Promise<{ scheduled: boolean }> {
    return this.http.post<{ scheduled: boolean }>(
      '/internal/alerting/v2/rule_doctor/_run'
    );
  }

  public async getExecution<T = unknown>(executionId: string): Promise<T> {
    return this.http.get<T>(
      `/internal/alerting/v2/rule_doctor/executions/${encodeURIComponent(executionId)}`
    );
  }

  public async listExecutions(): Promise<ListExecutionsResponse> {
    return this.http.get<ListExecutionsResponse>(
      '/internal/alerting/v2/rule_doctor/executions'
    );
  }

}
