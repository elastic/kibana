/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AlertAction } from '../../routes/schemas/alert_action_schema';

@injectable()
export class AlertActionsClient {
  constructor(@inject(Request) private readonly request: KibanaRequest) {}

  public async executeAction(params: {
    alertSeriesId: string;
    action: AlertAction;
  }): Promise<void> {
    // Empty implementation for now
  }
}
