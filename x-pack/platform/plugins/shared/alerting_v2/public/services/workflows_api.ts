/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { HttpStart } from '@kbn/core/public';
import { CoreStart } from '@kbn/core-di-browser';
import type { WorkflowsSearchParams, WorkflowListDto } from '@kbn/workflows';

@injectable()
export class WorkflowsApi {
  constructor(@inject(CoreStart('http')) private readonly http: HttpStart) {}

  public async searchWorkflows(params: WorkflowsSearchParams): Promise<WorkflowListDto> {
    return this.http.post<WorkflowListDto>('/api/workflows/search', {
      body: JSON.stringify(params),
    });
  }
}
