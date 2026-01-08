/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { Logger } from '@kbn/core-di';
import type { EcsError } from '@elastic/ecs';

interface DebugParams {
  message: string;
}

interface ErrorParams {
  error: Error;
  code?: string;
  type?: string;
}

@injectable()
export class LoggerService {
  constructor(@inject(Logger) private readonly logger: Logger) {}

  public debug({ message }: DebugParams): void {
    this.logger.debug(message);
  }

  public error({ error, code, type }: ErrorParams): void {
    const ecsError = this.buildError({ error, code, type });
    this.logger.error(error.message, {
      error: ecsError,
    });
  }

  private buildError({ error, code, type }: ErrorParams): EcsError {
    return {
      code: code ?? 'UNKNOWN_ERROR',
      message: error.message,
      stack_trace: error.stack,
      type: type ?? 'Error',
    };
  }
}
