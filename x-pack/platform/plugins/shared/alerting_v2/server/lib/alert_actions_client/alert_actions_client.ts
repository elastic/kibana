/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable, optional } from 'inversify';
import { PluginStart } from '@kbn/core-di';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { AlertAction } from '../../routes/schemas/alert_action_schema';
import { LoggerService } from '../services/logger_service/logger_service';

@injectable()
export class AlertActionsClient {
  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @inject(LoggerService) private readonly logger: LoggerService,
    @optional() @inject(PluginStart('security')) private readonly security?: SecurityPluginStart
  ) {}

  private async getUserName(): Promise<string | null> {
    return this.security?.authc.getCurrentUser(this.request)?.username ?? null;
  }

  public async executeAction(params: {
    alertSeriesId: string;
    action: AlertAction;
  }): Promise<void> {
    const username = await this.getUserName();

    this.logger.info({
      message: `Executing action [${params.action.action_type}] on alert [${
        params.alertSeriesId
      }] by user [${username ?? 'unknown'}]`,
    });

    // Empty implementation for now
  }
}
