/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import { ALERTING_LOG_CODES } from '../errors/error_codes';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';

/**
 * An opt-in for the `alerting.alertStatusChanged` workflow trigger.
 *
 * Until at least one opt-in is registered, nothing is built or published for the trigger. The
 * caller owns its own enablement signal, so alerting never reads settings or flags on its behalf.
 */
export interface AlertStatusChangedOptIn {
  /**
   * Returns true when status change events should be published for the work the given request
   * belongs to: the rule run's request for rule executions, or the request the alert events
   * client was scoped with for alerts written through it. The answer can differ per space. A
   * check that throws is logged and treated as false.
   */
  isEnabled: (request: KibanaRequest) => Promise<boolean>;
}

/**
 * Opt-ins registered through `enableAlertStatusChanged` on the setup contract. Filled during
 * plugin setup and read afterward by everything that publishes alert status changes.
 */
@injectable()
export class AlertStatusChangedOptIns {
  private readonly optIns: AlertStatusChangedOptIn[] = [];
  private readonly logger: LoggerServiceContract;

  constructor(@inject(LoggerServiceToken) loggerService: LoggerServiceContract) {
    this.logger = loggerService.forSubsystem('events');
  }

  public register(optIn: AlertStatusChangedOptIn): void {
    this.optIns.push(optIn);
  }

  /**
   * True when any registered opt-in is enabled for the request. Every check that is reached runs
   * until one returns true, so a failing check can never stop a later one from enabling it.
   */
  public async isEnabled(request: KibanaRequest): Promise<boolean> {
    for (const optIn of this.optIns) {
      try {
        if (await optIn.isEnabled(request)) {
          return true;
        }
      } catch (error) {
        this.logger.warn({
          message: 'An alert status changed opt-in check failed, treating it as disabled',
          code: ALERTING_LOG_CODES.EVENTS_ALERT_STATUS_CHANGED_OPT_IN_FAILED,
          error,
        });
      }
    }

    return false;
  }
}
