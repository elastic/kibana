/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isError, isFunction, isObject, isString } from 'lodash';
import { inject, injectable } from 'inversify';
import type { Logger, LogMessageSource } from '@kbn/logging';
import { createToken, Logger as BaseLogger } from '@kbn/core-di';
import type { EcsError } from '@elastic/ecs';
import type {
  AlertingLabels,
  AlertingSubsystemName,
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
  forSubsystem(name: AlertingSubsystemName): LoggerServiceContract;

  /**
   * Return a child logger that merges the given labels into every subsequent
   * log record. Bind once per execution (or tick); do not rebuild per call.
   */
  withLabels(labels: AlertingLabels): LoggerServiceContract;
}

export const LoggerServiceToken = createToken<LoggerServiceContract>('alerting_v2.LoggerService');

/**
 * Saved object and ES client failures surface as plain `{ message, statusCode }`
 * shapes rather than `Error` instances, and `String(...)` would reduce them to
 * `[object Object]`, dropping the only useful detail.
 */
const normalizeError = (error: unknown): Error => {
  if (isError(error)) {
    return error;
  }

  if (isObject(error) && 'message' in error && isString(error.message)) {
    return new Error(error.message);
  }

  return new Error(String(error));
};

const resolveMessage = (message: LogMessageSource): string =>
  isFunction(message) ? message() : message;

const buildEcsError = (error: Error, message?: string): EcsError => ({
  message: message ?? error.message,
  stack_trace: error.stack,
  type: error.constructor?.name || error.name,
});

@injectable()
export class LoggerService implements LoggerServiceContract {
  private readonly subsystems = new Map<AlertingSubsystemName, LoggerServiceContract>();
  private readonly boundLabels: AlertingLabels;

  constructor(
    @inject(BaseLogger) private readonly logger: Logger,
    boundLabels: AlertingLabels = {}
  ) {
    this.boundLabels = boundLabels;
  }

  public debug({ message, labels }: DebugParams): void {
    const mergedLabels = this.resolveLabels(labels);
    if (mergedLabels === undefined) {
      this.logger.debug(message);
      return;
    }

    this.logger.debug(message, { labels: mergedLabels });
  }

  public info({ message, labels }: InfoParams): void {
    const mergedLabels = this.resolveLabels(labels);
    if (mergedLabels === undefined) {
      this.logger.info(message);
      return;
    }

    this.logger.info(message, { labels: mergedLabels });
  }

  public warn({ message, code, labels, error }: WarnParams): void {
    this.logger.warn(message, {
      labels: { ...this.resolveLabels(labels), code },
      ...(error === undefined ? {} : { error: buildEcsError(normalizeError(error)) }),
    });
  }

  public error({ message, error, code, labels }: ErrorParams): void {
    const normalizedError = normalizeError(error);
    const resolvedMessage =
      message === undefined ? normalizedError.message : resolveMessage(message);

    this.logger.error(resolvedMessage, {
      labels: { ...this.resolveLabels(labels), code },
      error: buildEcsError(normalizedError, resolvedMessage),
    });
  }

  public forSubsystem(name: AlertingSubsystemName): LoggerServiceContract {
    const subsystem =
      this.subsystems.get(name) ?? new LoggerService(this.logger.get(name), this.boundLabels);
    this.subsystems.set(name, subsystem);

    return subsystem;
  }

  public withLabels(labels: AlertingLabels): LoggerServiceContract {
    return new LoggerService(this.logger, { ...this.boundLabels, ...labels });
  }

  private resolveLabels(labels?: AlertingLabels): AlertingLabels | undefined {
    const merged = { ...this.boundLabels, ...labels };
    return isEmpty(merged) ? undefined : merged;
  }
}
