/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core-di-browser';
import type { HttpStart } from '@kbn/core/public';
import type { WorkflowDetailDto, WorkflowListDto, WorkflowsSearchParams } from '@kbn/workflows';
import { inject, injectable } from 'inversify';

@injectable()
export class WorkflowsApi {
  constructor(@inject(CoreStart('http')) private readonly http: HttpStart) {}

  public async getWorkflow(id: string): Promise<WorkflowDetailDto> {
    return this.http.get<WorkflowDetailDto>(`/api/workflows/${id}`);
  }

  public async searchWorkflows(params: WorkflowsSearchParams): Promise<WorkflowListDto> {
    return this.http.post<WorkflowListDto>('/api/workflows/search', {
      body: JSON.stringify(params),
    });
  }
}
