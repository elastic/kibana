/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesSettingsAlertDeleteProperties } from '@kbn/alerting-types';
import type { KibanaRequest } from '@kbn/core/server';
import { type AlertDeletionContext, ALERT_DELETION_TASK_TYPE } from '../alert_deletion_client';
import { AlertAuditAction, alertAuditEvent } from '../../lib';

export const scheduleTask = async (
  context: AlertDeletionContext,
  request: KibanaRequest,
  settings: RulesSettingsAlertDeleteProperties,
  spaceIds: string[]
) => {
  try {
    const taskManager = await context.taskManagerStartPromise;
    await taskManager.ensureScheduled({
      id: `Alerting-${ALERT_DELETION_TASK_TYPE}`,
      taskType: ALERT_DELETION_TASK_TYPE,
      scope: ['alerting'],
      state: {},
      params: { settings, spaceIds },
    });

    const securityService = await context.securityService;
    const user = securityService.authc.getCurrentUser(request);
    context.auditService?.asScoped(request)?.log(
      alertAuditEvent({
        action: AlertAuditAction.SCHEDULE_DELETE,
        outcome: 'success',
        actor: user?.username,
        bulk: true,
      })
    );
  } catch (err) {
    context.logger.error(`Error scheduling alert deletion task: ${err.message}`);
    context.auditService?.asScoped(request)?.log(
      alertAuditEvent({
        action: AlertAuditAction.SCHEDULE_DELETE,
        outcome: 'failure',
        bulk: true,
        error: err,
      })
    );
    throw err;
  }
};
