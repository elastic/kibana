/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { WorkflowsClient } from '@kbn/workflows/server/types';
import { WorkflowsClientToken } from './tokens';

export interface WorkflowExtensionsServiceContract {
  emitEvent(triggerId: string, payload: Record<string, unknown>): Promise<void>;
}

@injectable()
export class WorkflowExtensionsService implements WorkflowExtensionsServiceContract {
  constructor(@inject(WorkflowsClientToken) private readonly client: WorkflowsClient) {}

  public async emitEvent(triggerId: string, payload: Record<string, unknown>): Promise<void> {
    await this.client.emitEvent(triggerId, payload);
  }
}
