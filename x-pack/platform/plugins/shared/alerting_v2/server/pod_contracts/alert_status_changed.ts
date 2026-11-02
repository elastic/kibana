/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { PodContractHandlers } from '@kbn/task-manager-plugin/server';
import { callKibana } from '@kbn/task-manager-plugin/server/task_pod';
import { inject, injectable } from 'inversify';
import { AlertStatusChangedOptIns } from '../lib/alert_status_changed';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../lib/services/logger_service/logger_service';
import { ALERTING_LOG_CODES } from '../lib/errors/error_codes';
import { POD_CONTRACT_PREFIX } from '.';

const CONTRACT = `${POD_CONTRACT_PREFIX}.alertStatusChanged`;

/**
 * Other plugins opt in to alert status change events with a function that runs in Kibana, so a
 * pod can't evaluate them itself: it asks Kibana, which runs the registered opt-ins for the
 * request. A failed call is treated as "not enabled", like a failing opt-in check in Kibana.
 */
@injectable()
export class RemoteAlertStatusChangedOptIns extends AlertStatusChangedOptIns {
  // Inversify does not inherit the parent's constructor injection, so it is repeated here.
  constructor(@inject(LoggerServiceToken) loggerService: LoggerServiceContract) {
    super(loggerService);
  }

  public async isEnabled(request: KibanaRequest): Promise<boolean> {
    try {
      return Boolean(await callKibana<boolean>(CONTRACT, 'isEnabled', [request]));
    } catch (error) {
      this.logger.warn({
        message: 'An alert status changed opt-in check failed, treating it as disabled',
        code: ALERTING_LOG_CODES.EVENTS_ALERT_STATUS_CHANGED_OPT_IN_FAILED,
        error,
      });
      return false;
    }
  }
}

export const createAlertStatusChangedHandlers = (
  getOptIns: () => Pick<AlertStatusChangedOptIns, 'isEnabled'>
): PodContractHandlers => ({
  isEnabled: async (_ctx, request) => getOptIns().isEnabled(request as KibanaRequest),
});
