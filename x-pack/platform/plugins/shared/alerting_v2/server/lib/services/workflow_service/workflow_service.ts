/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStart } from '@kbn/core-di';
import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { inject, injectable } from 'inversify';
import type { AlertingServerStartDependencies } from '../../../types';
import { LoggerServiceToken, type LoggerServiceContract } from '../logger_service/logger_service';

export interface WorkflowServiceContract {
  emitEvent(
    request: KibanaRequest,
    triggerId: string,
    payload: Record<string, unknown>
  ): Promise<void>;
}

@injectable()
export class WorkflowService implements WorkflowServiceContract {
  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(
      PluginStart<AlertingServerStartDependencies['workflowsExtensions']>('workflowsExtensions')
    )
    private readonly workflowsExtensions: WorkflowsExtensionsServerPluginStart,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract
  ) {
    this.logger = loggerService.forSubsystem('events');
  }

  public async emitEvent(
    request: KibanaRequest,
    triggerId: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const client = await this.workflowsExtensions.getClient(request);

    if (!client.isWorkflowsAvailable) {
      this.logger.debug({
        message: () => 'Workflows are not available, dropping trigger',
        labels: { resource: triggerId },
      });

      return;
    }

    await client.emitEvent(triggerId, payload);
  }
}
