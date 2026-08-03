/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isError, isFunction } from 'lodash';
import { inject, injectable } from 'inversify';
import type { Logger, LogMessageSource } from '@kbn/logging';
import { createToken, Logger as BaseLogger } from '@kbn/core-di';
import type { EcsError } from '@elastic/ecs';
import type {
  AlertingV2SubsystemName,
  DebugParams,
  ErrorParams,
  InfoParams,
  WarnParams,
} from './types';

export interface LoggerServiceContract {
  debug(params: DebugParams): void;
  info(params: InfoParams): void;
  warn(params: WarnParams): void;
  error(params: ErrorParams): void;

  /** Return a child logger scoped to a subsystem name. */
  forSubsystem(name: AlertingV2SubsystemName): LoggerServiceContract;
}

export const LoggerServiceToken = createToken<LoggerServiceContract>('alerting_v2.LoggerService');

const normalizeError = (error: unknown): Error =>
  isError(error) ? error : new Error(String(error));

const resolveMessage = (message: LogMessageSource): string =>
  isFunction(message) ? message() : message;

const buildEcsError = (error: Error, message?: string): EcsError => ({
  message: message ?? error.message,
  stack_trace: error.stack,
  type: error.constructor?.name || error.name,
});

@injectable()
export class LoggerService implements LoggerServiceContract {
  private readonly subsystems = new Map<AlertingV2SubsystemName, LoggerServiceContract>();

  constructor(@inject(BaseLogger) private readonly logger: Logger) {}

  public debug({ message, labels }: DebugParams): void {
    if (isEmpty(labels)) {
      this.logger.debug(message);
      return;
    }

    this.logger.debug(message, { labels });
  }

  public info({ message, labels }: InfoParams): void {
    if (isEmpty(labels)) {
      this.logger.info(message);
      return;
    }

    this.logger.info(message, { labels });
  }

  public warn({ message, code, labels, error }: WarnParams): void {
    this.logger.warn(message, {
      labels: { ...labels, code },
      ...(error === undefined ? {} : { error: buildEcsError(normalizeError(error)) }),
    });
  }

  public error({ message, error, code, labels }: ErrorParams): void {
    const normalizedError = normalizeError(error);
    const resolvedMessage =
      message === undefined ? normalizedError.message : resolveMessage(message);

    this.logger.error(resolvedMessage, {
      labels: { ...labels, code },
      error: buildEcsError(normalizedError, resolvedMessage),
    });
  }

  public forSubsystem(name: AlertingV2SubsystemName): LoggerServiceContract {
    const subsystem = this.subsystems.get(name) ?? new LoggerService(this.logger.get(name));
    this.subsystems.set(name, subsystem);

    return subsystem;
  }
}
