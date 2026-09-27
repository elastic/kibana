/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Response } from '@kbn/core-di-server';
import type { KibanaResponseFactory } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../lib/services/logger_service/logger_service';

@injectable()
export class AlertingRouteContext {
  public readonly logger: LoggerServiceContract;

  constructor(
    @inject(Response) public readonly response: KibanaResponseFactory,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract
  ) {
    this.logger = loggerService.forSubsystem('routes');
  }
}
