/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { ServiceIdentifier } from 'inversify';
import type { Logger, LogMeta, LogMessageSource } from '@kbn/logging';
import { Logger as BaseLogger } from '@kbn/core-di';
import type { EcsError } from '@elastic/ecs';

export interface DebugParams<Meta extends LogMeta = LogMeta> {
  message: LogMessageSource;
  meta?: Meta;
}

export interface InfoParams<Meta extends LogMeta = LogMeta> {
  message: LogMessageSource;
  meta?: Meta;
}

export interface WarnParams<Meta extends LogMeta = LogMeta> {
  message: LogMessageSource;
  meta?: Meta;
}

export interface ErrorParams {
  error: Error;
  code?: string;
  type?: string;
}

export interface LoggerServiceContract {
  debug<Meta extends LogMeta = LogMeta>(params: DebugParams<Meta>): void;
  info<Meta extends LogMeta = LogMeta>(params: InfoParams<Meta>): void;
  warn<Meta extends LogMeta = LogMeta>(params: WarnParams<Meta>): void;
  error(params: ErrorParams): void;
}

export const LoggerServiceToken = Symbol.for(
  'alerting_v2.LoggerService'
) as ServiceIdentifier<LoggerServiceContract>;

@injectable()
export class LoggerService implements LoggerServiceContract {
  constructor(@inject(BaseLogger) private readonly logger: Logger) {}

  public debug<Meta extends LogMeta = LogMeta>({ message, meta }: DebugParams<Meta>): void {
    this.logger.debug<Meta>(message, meta);
  }

  public error({ error, code, type }: ErrorParams): void {
    const ecsError = this.buildError({ error, code, type });
    this.logger.error(error.message, {
      error: ecsError,
    });
  }

  public info<Meta extends LogMeta = LogMeta>({ message, meta }: InfoParams<Meta>): void {
    this.logger.info<Meta>(message, meta);
  }

  public warn<Meta extends LogMeta = LogMeta>({ message, meta }: WarnParams<Meta>): void {
    this.logger.warn<Meta>(message, meta);
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
