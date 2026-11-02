/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { CoreStart } from '@kbn/core-di-server';
import type { AnalyticsServiceStart } from '@kbn/core/server';
import { LoggerServiceToken, type LoggerServiceContract } from '../logger_service/logger_service';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { AlertingEbtEventMap, AlertingEbtEventType } from '../../telemetry/ebt_events';

export interface EbtServiceContract {
  reportEvent<TEventType extends AlertingEbtEventType>(
    eventType: TEventType,
    data: AlertingEbtEventMap[TEventType]
  ): void;
}

/**
 * Reports the plugin's event-based telemetry (EBT) events through Core analytics.
 *
 * Reporting is best-effort: a failure is logged at `error` and never thrown, so
 * telemetry cannot affect the operation that produced the event.
 */
@injectable()
export class EbtService implements EbtServiceContract {
  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(CoreStart('analytics'))
    private readonly analytics: AnalyticsServiceStart,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract
  ) {
    this.logger = loggerService.forSubsystem('telemetry');
  }

  public reportEvent<TEventType extends AlertingEbtEventType>(
    eventType: TEventType,
    data: AlertingEbtEventMap[TEventType]
  ): void {
    try {
      this.analytics.reportEvent(eventType, data);
    } catch (error) {
      this.logger.error({
        message: () => `Failed to report ${eventType} telemetry event`,
        error,
        code: ALERTING_LOG_CODES.TELEMETRY_EBT_REPORT_FAILED,
        labels: { event_type: eventType },
      });
    }
  }
}
